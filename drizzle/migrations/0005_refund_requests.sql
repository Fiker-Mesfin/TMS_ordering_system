create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('cbe', 'telebirr')),
  account_number text not null check (length(trim(account_number)) between 6 and 32),
  reason text check (reason is null or length(reason) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'refunded')),
  admin_note text,
  refund_reference text,
  proof_path text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  refunded_at timestamptz,
  follow_up_status text check (follow_up_status is null or follow_up_status in ('pending', 'resolved')),
  follow_up_note text,
  follow_up_admin_note text,
  follow_up_requested_at timestamptz,
  follow_up_resolved_at timestamptz
);

create index refund_requests_created_idx on public.refund_requests (created_at desc);
create unique index refund_requests_one_open_or_paid_per_payment
  on public.refund_requests (payment_id)
  where status in ('pending', 'approved', 'refunded');

grant select on public.refund_requests to authenticated;
alter table public.refund_requests enable row level security;

create policy "refund requests read own or admin"
  on public.refund_requests for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create or replace function public.prevent_payment_during_refund()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('unverified', 'verified')
    and exists (
      select 1
      from public.refund_requests as requests
      where requests.payment_id = old.id
        and requests.status in ('pending', 'approved', 'refunded')
    ) then
    raise exception 'Payment cannot be resubmitted or verified while a refund request is active or completed';
  end if;
  return new;
end;
$$;

create trigger payments_prevent_during_refund
before update of status on public.payments
for each row
when (new.status is distinct from old.status)
execute function public.prevent_payment_during_refund();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'refund-proofs',
  'refund-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "refund proofs admin upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'refund-proofs'
    and public.has_role(auth.uid(), 'admin')
  );

create policy "refund proofs owner or admin read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'refund-proofs'
    and (
      public.has_role(auth.uid(), 'admin')
      or exists (
        select 1
        from public.refund_requests as requests
        where requests.proof_path = name
          and requests.user_id = auth.uid()
      )
    )
  );

create policy "refund proofs admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'refund-proofs' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'refund-proofs' and public.has_role(auth.uid(), 'admin'));

create policy "refund proofs admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'refund-proofs' and public.has_role(auth.uid(), 'admin'));

alter table public.notifications
  drop constraint if exists notifications_event_type_check;

alter table public.notifications
  add constraint notifications_event_type_check
  check (
    event_type in (
      'payment_reminder',
      'payment_submitted',
      'payment_verified',
      'payment_rejected',
      'refund_requested',
      'refund_approved',
      'refund_rejected',
      'refund_sent',
      'refund_follow_up',
      'refund_follow_up_resolved'
    )
  );

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
      and requests.status in ('pending', 'approved', 'refunded')
  ) then
    raise exception 'A refund request or completed refund already exists for this payment';
  end if;

  select orders.* into _order
  from public.orders as orders
  where orders.id = _order_id and orders.user_id = _uid;

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

revoke all on function public.request_payment_refund(uuid, text, text, text) from public, anon;
grant execute on function public.request_payment_refund(uuid, text, text, text) to authenticated;

create or replace function public.review_refund_request(
  _request_id uuid,
  _approve boolean,
  _note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _request public.refund_requests;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not allowed'; end if;
  select requests.* into _request
  from public.refund_requests as requests
  where requests.id = _request_id
  for update;
  if not found then raise exception 'Refund request not found'; end if;
  if _request.status <> 'pending' then raise exception 'This refund request has already been reviewed'; end if;
  if not _approve and coalesce(length(trim(_note)), 0) = 0 then
    raise exception 'Provide a reason when rejecting a refund request';
  end if;
  if _note is not null and length(_note) > 500 then raise exception 'The note is too long'; end if;

  update public.refund_requests
  set status = case when _approve then 'approved' else 'rejected' end,
      admin_note = nullif(trim(coalesce(_note, '')), ''),
      reviewed_at = now()
  where id = _request_id;
end;
$$;

revoke all on function public.review_refund_request(uuid, boolean, text) from public, anon;
grant execute on function public.review_refund_request(uuid, boolean, text) to authenticated;

create or replace function public.complete_payment_refund(
  _request_id uuid,
  _refund_reference text,
  _proof_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _request public.refund_requests;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not allowed'; end if;
  select requests.* into _request
  from public.refund_requests as requests
  where requests.id = _request_id
  for update;
  if not found then raise exception 'Refund request not found'; end if;
  if _request.status <> 'approved' then raise exception 'Only an approved refund can be marked as refunded'; end if;
  if coalesce(length(trim(_refund_reference)), 0) < 4
    or length(trim(_refund_reference)) > 100 then
    raise exception 'Enter a valid refund transaction reference';
  end if;
  if _proof_path is null or split_part(_proof_path, '/', 1) <> _request_id::text then
    raise exception 'Upload the refund proof for this request';
  end if;

  update public.refund_requests
  set status = 'refunded',
      refund_reference = trim(_refund_reference),
      proof_path = _proof_path,
      refunded_at = now()
  where id = _request_id;
end;
$$;

revoke all on function public.complete_payment_refund(uuid, text, text) from public, anon;
grant execute on function public.complete_payment_refund(uuid, text, text) to authenticated;

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
  where requests.id = _request_id and requests.user_id = auth.uid()
  for update;
  if not found then raise exception 'Refund not found'; end if;
  if _request.status <> 'refunded' then raise exception 'Follow-up is available after the refund is marked sent'; end if;
  if _request.follow_up_status = 'pending' then raise exception 'Your refund follow-up is already being reviewed'; end if;
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

revoke all on function public.request_refund_follow_up(uuid, text) from public, anon;
grant execute on function public.request_refund_follow_up(uuid, text) to authenticated;

create or replace function public.resolve_refund_follow_up(_request_id uuid, _note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _request public.refund_requests;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not allowed'; end if;
  select requests.* into _request
  from public.refund_requests as requests
  where requests.id = _request_id
  for update;
  if not found then raise exception 'Refund follow-up not found'; end if;
  if _request.follow_up_status <> 'pending' then raise exception 'This follow-up is not awaiting review'; end if;
  if _note is not null and length(_note) > 500 then raise exception 'The note is too long'; end if;

  update public.refund_requests
  set follow_up_status = 'resolved',
      follow_up_admin_note = nullif(trim(coalesce(_note, '')), ''),
      follow_up_resolved_at = now()
  where id = _request_id;
end;
$$;

revoke all on function public.resolve_refund_follow_up(uuid, text) from public, anon;
grant execute on function public.resolve_refund_follow_up(uuid, text) to authenticated;

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
  select orders.order_number, orders.contact_name into _order_number, _contact_name
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

create trigger refund_requests_notify_admins
after insert on public.refund_requests
for each row execute function public.notify_admins_of_refund_request();

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
        format('Refund transfer reference: %s. View the order page for the proof screenshot. Contact 0988241287 if you cannot find the transfer.', new.refund_reference)
      );
    end if;
  end if;

  if new.follow_up_status is distinct from old.follow_up_status then
    if new.follow_up_status = 'pending' then
      insert into public.notifications (recipient_id, order_id, event_type, title, body)
      select roles.user_id, new.order_id, 'refund_follow_up', 'Refund follow-up needs review',
        format('The customer says the refund for %s has not arrived. Please investigate before sending any further transfer.', new.refund_reference)
      from public.user_roles as roles
      where roles.role = 'admin';
    elsif new.follow_up_status = 'resolved' then
      insert into public.notifications (recipient_id, order_id, event_type, title, body)
      values (
        new.user_id, new.order_id, 'refund_follow_up_resolved', 'Refund follow-up reviewed',
        format(
          'We reviewed your refund follow-up.%s If you still need help, contact us at 0988241287.',
          case when nullif(trim(new.follow_up_admin_note), '') is null then ''
            else format(' Update: %s.', trim(new.follow_up_admin_note)) end
        )
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger refund_requests_notify_user
after update of status, follow_up_status on public.refund_requests
for each row execute function public.notify_user_of_refund_update();
