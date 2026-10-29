create table if not exists public.meal_slots (
  slot text primary key check (slot in ('breakfast', 'lunch', 'dinner')),
  label text not null,
  available boolean not null default true,
  sort_order int not null
);

insert into public.meal_slots (slot, label, sort_order) values
  ('breakfast', 'Breakfast', 1),
  ('lunch', 'Lunch', 2),
  ('dinner', 'Dinner', 3)
on conflict (slot) do update
set label = excluded.label,
    sort_order = excluded.sort_order;

grant select on public.meal_slots to anon, authenticated;
grant update on public.meal_slots to authenticated;
alter table public.meal_slots enable row level security;

drop policy if exists "available meals public read" on public.meal_slots;
create policy "available meals public read" on public.meal_slots
for select to anon, authenticated
using (available or public.has_role(auth.uid(), 'admin'));

drop policy if exists "meal slots admin update" on public.meal_slots;
create policy "meal slots admin update" on public.meal_slots
for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.delivery_date_availability (
  delivery_date date primary key,
  is_open boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.delivery_date_availability enable row level security;

alter table public.orders add column if not exists delivery_date date;
update public.orders
set delivery_date = (created_at at time zone 'Africa/Addis_Ababa')::date
where delivery_date is null;
alter table public.orders
  alter column delivery_date set default ((now() at time zone 'Africa/Addis_Ababa')::date),
  alter column delivery_date set not null;

alter table public.orders add column if not exists meal_slot text;
update public.orders set meal_slot = 'lunch' where meal_slot is null;
alter table public.orders alter column meal_slot set default 'lunch';
alter table public.orders alter column meal_slot set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_meal_slot_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_meal_slot_fkey
      foreign key (meal_slot) references public.meal_slots(slot);
  end if;
end;
$$;

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
  for _day in select _today + day_offset from generate_series(0, 1) as days(day_offset)
  loop
    insert into public.delivery_date_availability (delivery_date, is_open)
    values (_day, true)
    on conflict on constraint delivery_date_availability_pkey do nothing;
  end loop;

  return query
  select days.delivery_date, availability.is_open
  from (
    select _today + day_offset as delivery_date
    from generate_series(0, 1) as offsets(day_offset)
  ) as days
  join public.delivery_date_availability as availability
    on availability.delivery_date = days.delivery_date
  order by days.delivery_date;
end;
$$;

revoke execute on function public.get_delivery_schedule() from public;
grant execute on function public.get_delivery_schedule() to anon, authenticated;

create or replace function public.set_delivery_date_open(_delivery_date date, _is_open boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _today date := (now() at time zone 'Africa/Addis_Ababa')::date;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not allowed';
  end if;
  if _delivery_date < _today or _delivery_date > _today + 1 then
    raise exception 'Only today and tomorrow can be changed';
  end if;

  insert into public.delivery_date_availability (delivery_date, is_open, updated_at)
  values (_delivery_date, _is_open, now())
  on conflict (delivery_date) do update
  set is_open = excluded.is_open,
      updated_at = excluded.updated_at;
end;
$$;

revoke execute on function public.set_delivery_date_open(date, boolean) from public, anon;
grant execute on function public.set_delivery_date_open(date, boolean) to authenticated;

drop function if exists public.place_order(jsonb, uuid, text, text, text, text);

create function public.place_order(
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
  if _delivery_date is null or _delivery_date < _today or _delivery_date > _today + 1 then
    raise exception 'Choose a delivery date of today or tomorrow';
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
