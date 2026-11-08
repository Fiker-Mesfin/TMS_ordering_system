create or replace function public.delivery_slot_end_at(_delivery_date date, _meal_slot text)
returns timestamptz
language sql
stable
set search_path = public
as $$
  select (
    _delivery_date
    + case _meal_slot
        when 'breakfast' then time '02:00'
        when 'lunch' then time '06:40'
        when 'dinner' then time '12:00'
      end
  ) at time zone 'Africa/Addis_Ababa'
$$;

revoke all on function public.delivery_slot_end_at(date, text) from public, anon, authenticated;

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
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not allowed';
  end if;

  select payments.* into _payment
  from public.payments as payments
  where payments.id = _payment_id;
  if not found then
    raise exception 'Payment not found';
  end if;

  select orders.* into _order
  from public.orders as orders
  where orders.id = _payment.order_id
  for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if _order.cancelled_at is not null then
    raise exception 'This order is closed and cannot be reviewed';
  end if;

  select payments.* into _payment
  from public.payments as payments
  where payments.id = _payment_id
  for update;
  if _payment.status <> 'unverified' then
    raise exception 'Payment is not awaiting review';
  end if;
  if _payment.submitted_at is null
    or nullif(trim(coalesce(_payment.transaction_ref, '')), '') is null then
    raise exception 'Payment reference has not been submitted';
  end if;

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
      'refund_follow_up_resolved',
      'order_cancelled'
    )
  );

create unique index notifications_one_order_cancellation_per_order
  on public.notifications (order_id)
  where event_type = 'order_cancelled' and order_id is not null;

create or replace function public.create_unpaid_payment_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _inserted integer;
begin
  insert into public.notifications (recipient_id, order_id, event_type, title, body)
  select
    orders.user_id,
    orders.id,
    'payment_reminder',
    'Your order is waiting for payment',
    format(
      '%s is still awaiting payment. Submit your payment details to continue. Delivery is scheduled for %s during %s.',
      orders.order_number,
      to_char(orders.delivery_date, 'FMDay, FMDD Mon'),
      initcap(orders.meal_slot)
    )
  from public.orders as orders
  join public.payments as payments on payments.order_id = orders.id
  where orders.status = 'pending'
    and orders.cancelled_at is null
    and orders.created_at <= now() - interval '1 hour'
    and payments.status = 'unverified'
    and payments.submitted_at is null
    and public.delivery_slot_end_at(orders.delivery_date, orders.meal_slot) > now()
  on conflict do nothing;

  get diagnostics _inserted = row_count;
  return _inserted;
end;
$$;

revoke all on function public.create_unpaid_payment_reminders() from public, anon, authenticated;

create or replace function public.cancel_expired_unpaid_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _order public.orders;
  _payment public.payments;
  _cancelled integer := 0;
begin
  for _order in
    select orders.*
    from public.orders as orders
    join public.payments as payments on payments.order_id = orders.id
    where orders.status = 'pending'
      and orders.cancelled_at is null
      and payments.status = 'unverified'
      and payments.submitted_at is null
      and public.delivery_slot_end_at(orders.delivery_date, orders.meal_slot) <= now()
    order by orders.id
    for update of orders skip locked
  loop
    select payments.* into _payment
    from public.payments as payments
    where payments.order_id = _order.id
    for update;
    if not found
      or _payment.status <> 'unverified'
      or _payment.submitted_at is not null then
      continue;
    end if;

    update public.orders
    set cancelled_at = now()
    where id = _order.id
      and status = 'pending'
      and cancelled_at is null;
    if not found then
      continue;
    end if;

    insert into public.notifications (recipient_id, order_id, event_type, title, body)
    values (
      _order.user_id,
      _order.id,
      'order_cancelled',
      'Order cancelled — payment not received',
      format(
        '%s was cancelled because payment details were not submitted before the delivery period ended.',
        _order.order_number
      )
    )
    on conflict do nothing;
    _cancelled := _cancelled + 1;
  end loop;

  return _cancelled;
end;
$$;

revoke all on function public.cancel_expired_unpaid_orders() from public, anon, authenticated;

do $$
declare
  _job_id bigint;
begin
  select jobid into _job_id
  from cron.job
  where jobname = 'tms-expire-unpaid-orders';

  if _job_id is not null then
    perform cron.unschedule(_job_id);
  end if;

  perform cron.schedule(
    'tms-expire-unpaid-orders',
    '*/5 * * * *',
    'select public.cancel_expired_unpaid_orders();'
  );
end;
$$;
