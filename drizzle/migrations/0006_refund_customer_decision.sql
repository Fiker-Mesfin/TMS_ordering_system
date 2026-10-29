alter table public.orders
  add column cancelled_at timestamptz;

alter table public.refund_requests
  add column customer_decision text
    check (customer_decision is null or customer_decision in ('continue', 'cancel')),
  add column customer_decided_at timestamptz;

drop index if exists public.refund_requests_one_open_or_paid_per_payment;
create unique index refund_requests_one_open_or_paid_per_payment
  on public.refund_requests (payment_id)
  where status in ('pending', 'approved')
     or (status = 'refunded' and coalesce(customer_decision, 'cancel') = 'cancel');

create or replace function public.prevent_payment_during_refund()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('unverified', 'verified') then
    if exists (
      select 1
      from public.orders as orders
      where orders.id = old.order_id
        and orders.cancelled_at is not null
    ) then
      raise exception 'This order is closed and cannot receive another payment';
    end if;

    if exists (
      select 1
      from public.refund_requests as requests
      where requests.payment_id = old.id
        and (
          requests.status in ('pending', 'approved')
          or (
            requests.status = 'refunded'
            and (
              requests.customer_decision is distinct from 'continue'
              or coalesce(new.submitted_at, '-infinity'::timestamptz)
                <= requests.customer_decided_at
            )
          )
        )
    ) then
      raise exception 'Payment cannot be submitted while a refund is active or awaiting your decision';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.submit_payment_proof(
  _order_id uuid,
  _method text,
  _reference text,
  _receipt_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _order public.orders;
  _payment public.payments;
begin
  select orders.* into _order
  from public.orders as orders
  where orders.id = _order_id
    and orders.user_id = auth.uid()
  for update;
  if not found then raise exception 'Order not found'; end if;
  if _order.cancelled_at is not null then
    raise exception 'This order is closed and cannot receive another payment';
  end if;

  select payments.* into _payment
  from public.payments as payments
  where payments.order_id = _order_id
    and payments.user_id = auth.uid()
  for update;
  if not found then raise exception 'Order not found'; end if;
  if _payment.status = 'verified' then raise exception 'This payment is already verified'; end if;
  if _method not in ('cbe', 'telebirr') then raise exception 'Choose CBE or Telebirr'; end if;
  if coalesce(length(trim(_reference)), 0) < 4 or length(_reference) > 64 then
    raise exception 'Please enter the transaction reference';
  end if;
  if _receipt_path is not null
    and split_part(_receipt_path, '/', 1) <> auth.uid()::text then
    raise exception 'Invalid receipt';
  end if;

  update public.payments
  set method = _method,
      transaction_ref = trim(_reference),
      receipt_path = coalesce(_receipt_path, receipt_path),
      submitted_at = now(),
      status = 'unverified',
      review_note = null,
      reviewed_at = null
  where id = _payment.id;
end;
$$;

revoke execute on function public.submit_payment_proof(uuid, text, text, text) from public, anon;
grant execute on function public.submit_payment_proof(uuid, text, text, text) to authenticated;

create or replace function public.review_payment(_payment_id uuid, _approve boolean, _note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _payment public.payments;
  _order public.orders;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not allowed'; end if;

  select payments.* into _payment
  from public.payments as payments
  where payments.id = _payment_id;
  if not found then raise exception 'Payment not found'; end if;

  select orders.* into _order
  from public.orders as orders
  where orders.id = _payment.order_id
  for update;
  if not found then raise exception 'Order not found'; end if;
  if _order.cancelled_at is not null then
    raise exception 'This order is closed and cannot be reviewed';
  end if;

  select payments.* into _payment
  from public.payments as payments
  where payments.id = _payment_id
  for update;
  if _payment.status = 'verified' then raise exception 'Already verified'; end if;

  if _approve then
    update public.payments
    set status = 'verified',
        reviewed_at = now(),
        review_note = nullif(trim(coalesce(_note, '')), '')
    where id = _payment.id;
    update public.orders
    set status = 'confirmed',
        confirmed_at = now()
    where id = _payment.order_id
      and cancelled_at is null;
  else
    update public.payments
    set status = 'rejected',
        reviewed_at = now(),
        review_note = nullif(trim(coalesce(_note, '')), '')
    where id = _payment.id;
  end if;
end;
$$;

revoke execute on function public.review_payment(uuid, boolean, text) from public, anon;
grant execute on function public.review_payment(uuid, boolean, text) to authenticated;

create or replace function public.request_payment_refund(
  _order_id uuid,
  _method text,
  _account_number text,
  _reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _payment public.payments;
  _order public.orders;
  _request_id uuid;
begin
  if _uid is null then raise exception 'Please sign in to request a refund'; end if;
  if _method not in ('cbe', 'telebirr') then raise exception 'Choose CBE or Telebirr'; end if;
  if coalesce(length(trim(_account_number)), 0) < 6
    or length(trim(_account_number)) > 32
    or trim(_account_number) !~ '^[0-9+ -]+$' then
    raise exception 'Enter a valid CBE account number or Telebirr phone number';
  end if;
  if _reason is not null and length(_reason) > 500 then
    raise exception 'The reason must be 500 characters or fewer';
  end if;

  select orders.* into _order
  from public.orders as orders
  where orders.id = _order_id
    and orders.user_id = _uid
    and orders.cancelled_at is null
  for update;
  if not found then raise exception 'Order not found or already closed'; end if;

  select payments.* into _payment
  from public.payments as payments
  where payments.order_id = _order_id
  for update;
  if not found or _payment.user_id <> _uid then raise exception 'Order not found'; end if;
  if _payment.status <> 'rejected' then
    raise exception 'A refund request is available after payment details are rejected';
  end if;
  if exists (
    select 1 from public.refund_requests as requests
    where requests.payment_id = _payment.id
      and (
        requests.status in ('pending', 'approved')
        or (
          requests.status = 'refunded'
          and (
            requests.customer_decision is distinct from 'continue'
            or coalesce(_payment.submitted_at, '-infinity'::timestamptz)
              <= requests.customer_decided_at
          )
        )
      )
  ) then
    raise exception 'A refund request is already active or the sent refund needs your decision';
  end if;

  insert into public.refund_requests (
    order_id, payment_id, user_id, amount, method, account_number, reason
  )
  values (
    _order.id, _payment.id, _uid, _payment.amount, _method, trim(_account_number),
    nullif(trim(coalesce(_reason, '')), '')
  )
  returning id into _request_id;
  return _request_id;
end;
$$;

create or replace function public.resolve_refund_customer_decision(
  _request_id uuid,
  _decision text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _request public.refund_requests;
  _order public.orders;
begin
  if _decision is null or _decision not in ('continue', 'cancel') then
    raise exception 'Choose whether to continue or close the order';
  end if;

  select requests.* into _request
  from public.refund_requests as requests
  where requests.id = _request_id
    and requests.user_id = auth.uid();
  if not found then raise exception 'Refund not found'; end if;

  select orders.* into _order
  from public.orders as orders
  where orders.id = _request.order_id
    and orders.user_id = auth.uid()
  for update;
  if not found then raise exception 'Order not found'; end if;
  if _order.cancelled_at is not null or _order.status = 'confirmed' then
    raise exception 'This order is already confirmed or closed';
  end if;

  select requests.* into _request
  from public.refund_requests as requests
  where requests.id = _request_id
    and requests.user_id = auth.uid()
  for update;
  if not found then raise exception 'Refund not found'; end if;
  if _request.status <> 'refunded' then
    raise exception 'The refund must be marked sent before you can decide';
  end if;
  if _request.customer_decision is not null then
    raise exception 'You have already chosen what to do with this order';
  end if;
  if _request.follow_up_status = 'pending' then
    raise exception 'Wait until the missing-refund investigation is reviewed';
  end if;

  update public.refund_requests
  set customer_decision = _decision,
      customer_decided_at = now()
  where id = _request_id;

  if _decision = 'cancel' then
    update public.orders
    set cancelled_at = now()
    where id = _request.order_id
      and user_id = auth.uid()
      and status <> 'confirmed'
      and cancelled_at is null;
    if not found then
      raise exception 'This order is already confirmed or closed';
    end if;
  end if;
end;
$$;

revoke all on function public.resolve_refund_customer_decision(uuid, text) from public, anon;
grant execute on function public.resolve_refund_customer_decision(uuid, text) to authenticated;

create or replace function public.request_refund_follow_up(_request_id uuid, _note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _request public.refund_requests;
begin
  select requests.* into _request
  from public.refund_requests as requests
  where requests.id = _request_id
    and requests.user_id = auth.uid()
  for update;
  if not found then raise exception 'Refund not found'; end if;
  if _request.status <> 'refunded' then
    raise exception 'Follow-up is available after the refund is marked sent';
  end if;
  if _request.customer_decision is not null then
    raise exception 'You have already chosen what to do with this order';
  end if;
  if _request.follow_up_status = 'pending' then
    raise exception 'Your refund follow-up is already being reviewed';
  end if;
  if _note is not null and length(_note) > 500 then raise exception 'The note is too long'; end if;

  update public.refund_requests
  set follow_up_status = 'pending',
      follow_up_note = nullif(trim(coalesce(_note, '')), ''),
      follow_up_admin_note = null,
      follow_up_requested_at = now(),
      follow_up_resolved_at = null
  where id = _request_id;
end;
$$;

create or replace function public.notify_admins_of_refund_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _order_number text;
  _contact_name text;
begin
  select orders.order_number, orders.contact_name
  into _order_number, _contact_name
  from public.orders as orders
  where orders.id = new.order_id;

  insert into public.notifications (recipient_id, order_id, event_type, title, body)
  select roles.user_id, new.order_id, 'refund_requested', 'Refund request needs review',
    format('%s requested a refund for %s.', _contact_name, _order_number)
  from public.user_roles as roles
  where roles.role = 'admin';
  return new;
end;
$$;

create or replace function public.notify_user_of_refund_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'approved' then
      insert into public.notifications (recipient_id, order_id, event_type, title, body)
      values (
        new.user_id, new.order_id, 'refund_approved', 'Refund request approved',
        'Your refund request was approved. We will send the refund and add its transaction details here.'
      );
    elsif new.status = 'rejected' then
      insert into public.notifications (recipient_id, order_id, event_type, title, body)
      values (
        new.user_id, new.order_id, 'refund_rejected', 'Refund request declined',
        format(
          'Your refund request was declined.%s For help, contact us at 0988241287.',
          case when nullif(trim(new.admin_note), '') is null then ''
            else format(' Reason: %s.', trim(new.admin_note)) end
        )
      );
    elsif new.status = 'refunded' then
      insert into public.notifications (recipient_id, order_id, event_type, title, body)
      values (
        new.user_id, new.order_id, 'refund_sent', 'Refund sent',
        format('Refund transfer reference: %s. Review the proof and choose to close this order or continue with a new payment.', new.refund_reference)
      );
    end if;
  end if;

  if new.customer_decision is distinct from old.customer_decision then
    if new.customer_decision = 'continue' then
      insert into public.notifications (recipient_id, order_id, event_type, title, body)
      select roles.user_id, new.order_id, 'refund_follow_up_resolved',
        'Customer continued the order',
        'The customer confirmed receiving the refund and chose to continue this order with a new payment.'
      from public.user_roles as roles
      where roles.role = 'admin';
    elsif new.customer_decision = 'cancel' then
      insert into public.notifications (recipient_id, order_id, event_type, title, body)
      select roles.user_id, new.order_id, 'refund_follow_up_resolved',
        'Customer closed the order',
        'The customer confirmed receiving the refund and closed this order.'
      from public.user_roles as roles
      where roles.role = 'admin';
    end if;
  end if;

  if new.follow_up_status is distinct from old.follow_up_status then
    if new.follow_up_status = 'pending' then
      insert into public.notifications (recipient_id, order_id, event_type, title, body)
      select roles.user_id, new.order_id, 'refund_follow_up', 'Refund follow-up needs review',
        format('The customer says the refund for %s has not arrived. Investigate before sending any further transfer.', new.refund_reference)
      from public.user_roles as roles
      where roles.role = 'admin';
    elsif new.follow_up_status = 'resolved' then
      insert into public.notifications (recipient_id, order_id, event_type, title, body)
      values (
        new.user_id, new.order_id, 'refund_follow_up_resolved', 'Refund follow-up reviewed',
        format(
          'We reviewed your refund follow-up.%s If you still need help, contact us at 0988241287.',
          case when nullif(trim(new.follow_up_admin_note), '') is null
            then '' else format(' Update: %s.', trim(new.follow_up_admin_note)) end
        )
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists refund_requests_notify_user on public.refund_requests;
create trigger refund_requests_notify_user
after update of status, follow_up_status, customer_decision on public.refund_requests
for each row execute function public.notify_user_of_refund_update();
