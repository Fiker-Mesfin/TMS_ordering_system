create extension if not exists pg_cron with schema pg_catalog;

drop trigger if exists orders_notify_parties on public.orders;
drop function if exists public.notify_parties_of_new_order();

delete from public.notifications
where event_type in ('order_created', 'order_payment_needed');

alter table public.notifications
  drop constraint if exists notifications_event_type_check;

alter table public.notifications
  add constraint notifications_event_type_check
  check (
    event_type in (
      'payment_reminder',
      'payment_submitted',
      'payment_verified',
      'payment_rejected'
    )
  );

create unique index notifications_one_payment_reminder_per_order
  on public.notifications (order_id)
  where event_type = 'payment_reminder' and order_id is not null;

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
    and orders.created_at <= now() - interval '1 hour'
    and payments.status = 'unverified'
    and payments.submitted_at is null
  on conflict do nothing;

  get diagnostics _inserted = row_count;
  return _inserted;
end;
$$;

revoke all on function public.create_unpaid_payment_reminders() from public, anon, authenticated;

do $$
declare
  _job_id bigint;
begin
  select jobid into _job_id
  from cron.job
  where jobname = 'tms-unpaid-payment-reminders';

  if _job_id is not null then
    perform cron.unschedule(_job_id);
  end if;

  perform cron.schedule(
    'tms-unpaid-payment-reminders',
    '*/5 * * * *',
    'select public.create_unpaid_payment_reminders();'
  );
end;
$$;
