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

create or replace function public.set_delivery_date_open(_delivery_date date, _is_open boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _today date := (now() at time zone 'Africa/Addis_Ababa')::date;
  _business_day_count integer;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not allowed';
  end if;
  if _delivery_date is null or extract(isodow from _delivery_date) not between 1 and 5 then
    raise exception 'Only weekday delivery dates can be changed';
  end if;

  select count(*) into _business_day_count
  from generate_series(
    (_today + 1)::timestamp,
    _delivery_date::timestamp,
    interval '1 day'
  ) as days(day)
  where extract(isodow from days.day) between 1 and 5;

  if _business_day_count < 1 or _business_day_count > 5 then
    raise exception 'Only the next five business days can be changed';
  end if;

  insert into public.delivery_date_availability (delivery_date, is_open, updated_at)
  values (_delivery_date, _is_open, now())
  on conflict (delivery_date) do update
  set is_open = excluded.is_open,
      updated_at = excluded.updated_at;
end;
$$;

create or replace function public.enforce_delivery_date_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _today date := (now() at time zone 'Africa/Addis_Ababa')::date;
  _local_now timestamp := now() at time zone 'Africa/Addis_Ababa';
  _business_day_count integer;
  _is_open boolean;
begin
  if tg_op = 'INSERT' then
    if new.delivery_date is null
      or extract(isodow from new.delivery_date) not between 1 and 5 then
      raise exception 'Choose a weekday delivery date';
    end if;

    select count(*) into _business_day_count
    from generate_series(
      (_today + 1)::timestamp,
      new.delivery_date::timestamp,
      interval '1 day'
    ) as days(day)
    where extract(isodow from days.day) between 1 and 5;

    if _business_day_count < 1 or _business_day_count > 2 then
      raise exception 'Choose one of the next two business days';
    end if;
  elsif new.delivery_date is distinct from old.delivery_date then
    if _local_now >= (old.delivery_date - 1 + time '11:00') then
      raise exception 'Delivery dates can only be changed before 11:00 LT on the day before delivery';
    end if;
    if new.delivery_date <= old.delivery_date
      or extract(isodow from new.delivery_date) not between 1 and 5 then
      raise exception 'A delivery can only be moved forward to a weekday';
    end if;

    select count(*) into _business_day_count
    from generate_series(
      (old.delivery_date + 1)::timestamp,
      new.delivery_date::timestamp,
      interval '1 day'
    ) as days(day)
    where extract(isodow from days.day) between 1 and 5;

    if _business_day_count < 1 or _business_day_count > 2 then
      raise exception 'A delivery can only be moved forward by up to two business days';
    end if;
  else
    return new;
  end if;

  insert into public.delivery_date_availability (delivery_date, is_open)
  values (new.delivery_date, true)
  on conflict (delivery_date) do nothing;

  select availability.is_open into _is_open
  from public.delivery_date_availability as availability
  where availability.delivery_date = new.delivery_date
  for update;

  if coalesce(_is_open, true) is false then
    raise exception 'Orders for that delivery date are closed';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_delivery_date_rules on public.orders;
create trigger enforce_delivery_date_rules
before insert or update of delivery_date on public.orders
for each row execute function public.enforce_delivery_date_rules();

create or replace function public.place_order(
  _items jsonb,
  _area_id uuid,
  _address text,
  _contact_name text,
  _contact_phone text,
  _notes text,
  _delivery_date date,
  _meal_slot text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _area public.delivery_areas;
  _order_id uuid;
  _subtotal numeric(10,2) := 0;
  _it jsonb;
  _menu public.menu_items;
  _qty int;
  _ex_ids uuid[];
  _ex_count int;
  _ex_total numeric(10,2);
  _ex_json jsonb;
  _unit numeric(10,2);
  _today date := (now() at time zone 'Africa/Addis_Ababa')::date;
  _business_day_count integer;
  _delivery_open boolean;
  _meal_available boolean;
begin
  if _uid is null then raise exception 'Please sign in to place an order'; end if;
  if _items is null or jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Your cart is empty';
  end if;
  if jsonb_array_length(_items) > 30 then raise exception 'Too many items in one order'; end if;
  if coalesce(length(trim(_address)), 0) < 5 or length(_address) > 300 then
    raise exception 'Please enter a valid delivery address';
  end if;
  if coalesce(length(trim(_contact_name)), 0) < 2 or length(_contact_name) > 100 then
    raise exception 'Please enter your name';
  end if;
  if coalesce(_contact_phone, '') !~ '^(\+251|0)?[79][0-9]{8}$' then
    raise exception 'Please enter a valid Ethiopian phone number';
  end if;
  if _notes is not null and length(_notes) > 500 then raise exception 'Notes are too long'; end if;
  if _delivery_date is null
    or extract(isodow from _delivery_date) not between 1 and 5 then
    raise exception 'Choose a weekday delivery date';
  end if;

  select count(*) into _business_day_count
  from generate_series(
    (_today + 1)::timestamp,
    _delivery_date::timestamp,
    interval '1 day'
  ) as days(day)
  where extract(isodow from days.day) between 1 and 5;

  if _business_day_count < 1 or _business_day_count > 2 then
    raise exception 'Choose one of the next two business days';
  end if;

  insert into public.delivery_date_availability (delivery_date, is_open)
  values (_delivery_date, true)
  on conflict (delivery_date) do nothing;
  select is_open into _delivery_open
  from public.delivery_date_availability
  where delivery_date = _delivery_date
  for update;
  if not _delivery_open then raise exception 'Orders for that delivery date are closed'; end if;

  select available into _meal_available
  from public.meal_slots
  where slot = _meal_slot
  for share;
  if not coalesce(_meal_available, false) then
    raise exception 'That meal slot is unavailable';
  end if;

  select * into _area from public.delivery_areas where id = _area_id;
  if not found or not _area.enabled then raise exception 'We do not deliver to that area right now'; end if;

  insert into public.orders (
    user_id, delivery_area_id, delivery_area_name, address, contact_name, contact_phone,
    notes, subtotal, delivery_fee, total, delivery_date, meal_slot
  )
  values (
    _uid, _area.id, _area.name, trim(_address), trim(_contact_name), trim(_contact_phone),
    nullif(trim(coalesce(_notes, '')), ''), 0, 0, 0, _delivery_date, _meal_slot
  )
  returning id into _order_id;

  for _it in select * from jsonb_array_elements(_items) loop
    select * into _menu from public.menu_items where id = (_it->>'menu_item_id')::uuid;
    if not found or not _menu.available then raise exception 'An item in your cart is no longer available'; end if;
    _qty := (_it->>'quantity')::int;
    if _qty is null or _qty < 1 or _qty > 20 then raise exception 'Invalid quantity for %', _menu.name; end if;

    select coalesce(array_agg(distinct (x)::uuid), '{}') into _ex_ids
    from jsonb_array_elements_text(coalesce(_it->'extra_ids', '[]'::jsonb)) x;
    select count(*), coalesce(sum(price), 0),
      coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'price', price)), '[]')
    into _ex_count, _ex_total, _ex_json
    from public.menu_extras
    where id = any(_ex_ids) and available;
    if _ex_count <> coalesce(array_length(_ex_ids, 1), 0) then
      raise exception 'An extra in your cart is no longer available';
    end if;

    _unit := _menu.price + _ex_total;
    insert into public.order_items (order_id, menu_item_id, name, unit_price, quantity, extras, line_total)
    values (_order_id, _menu.id, _menu.name, _unit, _qty, _ex_json, _unit * _qty);
    _subtotal := _subtotal + _unit * _qty;
  end loop;

  update public.orders
  set subtotal = _subtotal, delivery_fee = 0, total = _subtotal
  where id = _order_id;
  insert into public.payments (order_id, user_id, amount)
  values (_order_id, _uid, _subtotal);
  return _order_id;
end;
$$;

revoke execute on function public.place_order(jsonb, uuid, text, text, text, text, date, text)
from public, anon;
grant execute on function public.place_order(jsonb, uuid, text, text, text, text, date, text)
to authenticated;

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

create or replace function public.reschedule_order_delivery(_order_id uuid, _delivery_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to change the delivery date';
  end if;

  update public.orders
  set delivery_date = _delivery_date
  where id = _order_id
    and user_id = auth.uid()
    and cancelled_at is null;

  if not found then
    raise exception 'Order not found or no longer active';
  end if;
end;
$$;

revoke execute on function public.reschedule_order_delivery(uuid, date) from public, anon;
grant execute on function public.reschedule_order_delivery(uuid, date) to authenticated;
