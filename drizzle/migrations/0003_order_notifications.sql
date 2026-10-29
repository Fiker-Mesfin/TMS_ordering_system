create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  event_type text not null check (
    event_type in (
      'order_created',
      'order_payment_needed',
      'payment_submitted',
      'payment_verified',
      'payment_rejected'
    )
  ),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
alter table public.notifications enable row level security;

create policy "notifications read own"
  on public.notifications for select to authenticated
  using (recipient_id = auth.uid());
create policy "notifications mark own read"
  on public.notifications for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create or replace function public.notify_parties_of_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, order_id, event_type, title, body)
  select roles.user_id, new.id, 'order_created', 'New order received',
    format(
      '%s was placed for %s during %s. Review the order and payment.',
      new.order_number,
      to_char(new.delivery_date, 'FMDay, FMDD Mon'),
      initcap(new.meal_slot)
    )
  from public.user_roles as roles
  where roles.role = 'admin';

  insert into public.notifications (recipient_id, order_id, event_type, title, body)
  values (
    new.user_id,
    new.id,
    'order_payment_needed',
    'Order saved — payment needed',
    format(
      '%s is saved for delivery on %s during %s. Complete payment to confirm your preorder.',
      new.order_number,
      to_char(new.delivery_date, 'FMDay, FMDD Mon'),
      initcap(new.meal_slot)
    )
  );
  return new;
end;
$$;

create trigger orders_notify_parties
after insert on public.orders
for each row execute function public.notify_parties_of_new_order();

create or replace function public.notify_admins_of_payment_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _order_number text;
begin
  if new.submitted_at is null
    or (old.submitted_at is not null and new.submitted_at <= old.submitted_at) then
    return new;
  end if;

  select orders.order_number into _order_number
  from public.orders as orders
  where orders.id = new.order_id;

  insert into public.notifications (recipient_id, order_id, event_type, title, body)
  select roles.user_id, new.order_id, 'payment_submitted', 'Payment proof submitted',
    format('Payment for %s is ready for review.', _order_number)
  from public.user_roles as roles
  where roles.role = 'admin';
  return new;
end;
$$;

create trigger payments_notify_admins
after update of submitted_at on public.payments
for each row
when (new.submitted_at is distinct from old.submitted_at)
execute function public.notify_admins_of_payment_submission();

create or replace function public.notify_customer_of_payment_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _order_number text;
  _delivery_date date;
  _meal_slot text;
begin
  if new.status = old.status or new.status not in ('verified', 'rejected') then
    return new;
  end if;

  select orders.order_number, orders.delivery_date, orders.meal_slot
  into _order_number, _delivery_date, _meal_slot
  from public.orders as orders
  where orders.id = new.order_id;

  if new.status = 'verified' then
    insert into public.notifications (recipient_id, order_id, event_type, title, body)
    values (
      new.user_id,
      new.order_id,
      'payment_verified',
      'Payment verified — order confirmed',
      format(
        'Your burgers are scheduled for delivery on %s during %s.',
        to_char(_delivery_date, 'FMDay, FMDD Mon'),
        initcap(_meal_slot)
      )
    );
  else
    insert into public.notifications (recipient_id, order_id, event_type, title, body)
    values (
      new.user_id,
      new.order_id,
      'payment_rejected',
      'Payment needs attention',
      format(
        '%s could not be verified.%s Please review the note and submit your payment proof again.',
        _order_number,
        case
          when nullif(trim(new.review_note), '') is null then ''
          else format(' Note: %s.', trim(new.review_note))
        end
      )
    );
  end if;

  return new;
end;
$$;

create trigger payments_notify_customer
after update of status on public.payments
for each row
when (new.status is distinct from old.status)
execute function public.notify_customer_of_payment_review();
