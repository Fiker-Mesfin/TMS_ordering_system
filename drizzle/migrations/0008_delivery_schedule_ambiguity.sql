create or replace function public.get_delivery_schedule()
returns table (delivery_date date, is_open boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  _today date := (now() at time zone 'Africa/Addis_Ababa')::date;
  _day date;
begin
  for _day in
    select (_today + offsets.day_offset)::date
    from generate_series(1, 7) as offsets(day_offset)
    where extract(isodow from _today + offsets.day_offset) between 1 and 5
    order by 1
    limit 2
  loop
    insert into public.delivery_date_availability (delivery_date, is_open)
    values (_day, true)
    on conflict (delivery_date) do nothing;
  end loop;

  return query
  select days.delivery_date, availability.is_open
  from (
    select (_today + offsets.day_offset)::date as delivery_date
    from generate_series(1, 7) as offsets(day_offset)
    where extract(isodow from _today + offsets.day_offset) between 1 and 5
    order by 1
    limit 2
  ) as days
  join public.delivery_date_availability as availability
    on availability.delivery_date = days.delivery_date
  order by days.delivery_date;
end;
$$;

create or replace function public.get_admin_delivery_schedule()
returns table (delivery_date date, is_open boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  _today date := (now() at time zone 'Africa/Addis_Ababa')::date;
  _day date;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not allowed';
  end if;

  for _day in
    select (_today + offsets.day_offset)::date
    from generate_series(1, 10) as offsets(day_offset)
    where extract(isodow from _today + offsets.day_offset) between 1 and 5
    order by 1
    limit 5
  loop
    insert into public.delivery_date_availability (delivery_date, is_open)
    values (_day, true)
    on conflict (delivery_date) do nothing;
  end loop;

  return query
  select days.delivery_date, availability.is_open
  from (
    select (_today + offsets.day_offset)::date as delivery_date
    from generate_series(1, 10) as offsets(day_offset)
    where extract(isodow from _today + offsets.day_offset) between 1 and 5
    order by 1
    limit 5
  ) as days
  join public.delivery_date_availability as availability
    on availability.delivery_date = days.delivery_date
  order by days.delivery_date;
end;
$$;

revoke execute on function public.get_admin_delivery_schedule() from public, anon;
grant execute on function public.get_admin_delivery_schedule() to authenticated;

create or replace function public.get_order_reschedule_options(_order_id uuid)
returns table (can_reschedule boolean, delivery_date date, is_open boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  _order public.orders;
  _local_now timestamp := now() at time zone 'Africa/Addis_Ababa';
  _can_reschedule boolean;
  _day date;
begin
  if auth.uid() is null then
    raise exception 'Sign in to view delivery date options';
  end if;

  select * into _order
  from public.orders
  where id = _order_id and user_id = auth.uid();
  if not found then
    raise exception 'Order not found';
  end if;

  _can_reschedule :=
    _order.cancelled_at is null
    and _local_now < (_order.delivery_date - 1 + time '11:00');

  if not _can_reschedule then
    return query select false, null::date, false;
    return;
  end if;

  for _day in
    select (_order.delivery_date + offsets.day_offset)::date
    from generate_series(1, 7) as offsets(day_offset)
    where extract(isodow from _order.delivery_date + offsets.day_offset) between 1 and 5
    order by 1
    limit 2
  loop
    insert into public.delivery_date_availability (delivery_date, is_open)
    values (_day, true)
    on conflict (delivery_date) do nothing;

    return query
    select true, _day, availability.is_open
    from public.delivery_date_availability as availability
    where availability.delivery_date = _day;
  end loop;
end;
$$;

revoke execute on function public.get_order_reschedule_options(uuid) from public, anon;
grant execute on function public.get_order_reschedule_options(uuid) to authenticated;
