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
    and nullif(trim(coalesce(payments.transaction_ref, '')), '') is null
    and public.delivery_slot_end_at(orders.delivery_date, orders.meal_slot) > now()
    and orders.delivery_date >= (now() at time zone 'Africa/Addis_Ababa')::date
    and coalesce((
      select availability.is_open
      from public.delivery_date_availability as availability
      where availability.delivery_date = orders.delivery_date
    ), true)
    and coalesce((
      select meal_slots.available
      from public.meal_slots as meal_slots
      where meal_slots.slot = orders.meal_slot
    ), false)
    and not exists (
      select 1
      from public.order_items as order_items
      join public.menu_items as menu_items on menu_items.id = order_items.menu_item_id
      where order_items.order_id = orders.id
        and (
          menu_items.available = false
          or exists (
            select 1
            from public.menu_item_date_availability as date_availability
            where date_availability.menu_item_id = order_items.menu_item_id
              and date_availability.delivery_date = orders.delivery_date
              and date_availability.is_available = false
          )
        )
    )
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
  _today date := (now() at time zone 'Africa/Addis_Ababa')::date;
  _cancelled integer := 0;
  _delivery_open boolean;
  _meal_available boolean;
  _menu_closed boolean;
  _reason text;
begin
  for _order in
    select orders.*
    from public.orders as orders
    join public.payments as payments on payments.order_id = orders.id
    where orders.status = 'pending'
      and orders.cancelled_at is null
      and payments.status = 'unverified'
      and payments.submitted_at is null
      and nullif(trim(coalesce(payments.transaction_ref, '')), '') is null
    order by orders.id
    for update of orders skip locked
  loop
    select payments.* into _payment
    from public.payments as payments
    where payments.order_id = _order.id
    for update;
    if not found
      or _payment.status <> 'unverified'
      or _payment.submitted_at is not null
      or nullif(trim(coalesce(_payment.transaction_ref, '')), '') is not null then
      continue;
    end if;

    _reason := null;

    if _order.delivery_date is null then
      _reason := 'because the delivery date is no longer available';
    elsif _order.delivery_date < _today then
      _reason := 'because the delivery date has passed';
    elsif public.delivery_slot_end_at(_order.delivery_date, _order.meal_slot) <= now() then
      _reason := 'because payment details were not submitted before the delivery period ended';
    else
      _delivery_open := true;
      _meal_available := false;

      select coalesce(availability.is_open, true)
      into _delivery_open
      from public.delivery_date_availability as availability
      where availability.delivery_date = _order.delivery_date;
      _delivery_open := coalesce(_delivery_open, true);

      select coalesce(meal_slots.available, false)
      into _meal_available
      from public.meal_slots as meal_slots
      where meal_slots.slot = _order.meal_slot;
      _meal_available := coalesce(_meal_available, false);

      select exists (
        select 1
        from public.order_items as order_items
        join public.menu_items as menu_items on menu_items.id = order_items.menu_item_id
        where order_items.order_id = _order.id
          and (
            menu_items.available = false
            or exists (
              select 1
              from public.menu_item_date_availability as date_availability
              where date_availability.menu_item_id = order_items.menu_item_id
                and date_availability.delivery_date = _order.delivery_date
                and date_availability.is_available = false
            )
          )
      ) into _menu_closed;

      if not _delivery_open or not _meal_available or _menu_closed then
        _reason := 'because the menu or delivery date was closed';
      end if;
    end if;

    if _reason is null then
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
      'Order cancelled',
      format(
        '%s was cancelled %s.',
        _order.order_number,
        _reason
      )
    )
    on conflict do nothing;
    _cancelled := _cancelled + 1;
  end loop;

  return _cancelled;
end;
$$;

revoke all on function public.cancel_expired_unpaid_orders() from public, anon, authenticated;
