
create type public.app_role as enum ('admin', 'customer');
create type public.order_status as enum ('pending', 'confirmed');
create type public.payment_status as enum ('unverified', 'verified', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  image_key text,
  available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;
grant all on public.menu_items to service_role;
alter table public.menu_items enable row level security;
create policy "menu public read" on public.menu_items for select to anon, authenticated using (true);
create policy "menu admin write" on public.menu_items for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.menu_extras (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  available boolean not null default true,
  sort_order int not null default 0
);
grant select on public.menu_extras to anon, authenticated;
grant insert, update, delete on public.menu_extras to authenticated;
grant all on public.menu_extras to service_role;
alter table public.menu_extras enable row level security;
create policy "extras public read" on public.menu_extras for select to anon, authenticated using (true);
create policy "extras admin write" on public.menu_extras for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  enabled boolean not null default true,
  sort_order int not null default 0
);
grant select on public.delivery_areas to anon, authenticated;
grant insert, update, delete on public.delivery_areas to authenticated;
grant all on public.delivery_areas to service_role;
alter table public.delivery_areas enable row level security;
create policy "areas public read" on public.delivery_areas for select to anon, authenticated using (true);
create policy "areas admin write" on public.delivery_areas for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create sequence public.order_number_seq start 1001;
grant usage on sequence public.order_number_seq to service_role;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('TMS-' || nextval('public.order_number_seq')::text),
  user_id uuid not null,
  status order_status not null default 'pending',
  delivery_area_id uuid references public.delivery_areas(id),
  delivery_area_name text not null,
  address text not null,
  contact_name text not null,
  contact_phone text not null,
  notes text,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders read own or admin" on public.orders for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid,
  name text not null,
  unit_price numeric(10,2) not null,
  quantity int not null,
  extras jsonb not null default '[]',
  line_total numeric(10,2) not null
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "items read via order" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
    and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  user_id uuid not null,
  amount numeric(10,2) not null,
  status payment_status not null default 'unverified',
  method text,
  transaction_ref text,
  receipt_path text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "payments read own or admin" on public.payments for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create or replace function public.place_order(
  _items jsonb, _area_id uuid, _address text, _contact_name text, _contact_phone text, _notes text
) returns uuid language plpgsql security definer set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _area public.delivery_areas;
  _order_id uuid;
  _subtotal numeric(10,2) := 0;
  _it jsonb; _menu public.menu_items; _qty int; _ex_ids uuid[]; _ex_count int;
  _ex_total numeric(10,2); _ex_json jsonb; _unit numeric(10,2);
begin
  if _uid is null then raise exception 'Please sign in to place an order'; end if;
  if _items is null or jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Your cart is empty'; end if;
  if jsonb_array_length(_items) > 30 then raise exception 'Too many items in one order'; end if;
  if coalesce(length(trim(_address)),0) < 5 or length(_address) > 300 then raise exception 'Please enter a valid delivery address'; end if;
  if coalesce(length(trim(_contact_name)),0) < 2 or length(_contact_name) > 100 then raise exception 'Please enter your name'; end if;
  if coalesce(_contact_phone,'') !~ '^(\+251|0)?[79][0-9]{8}$' then raise exception 'Please enter a valid Ethiopian phone number'; end if;
  if _notes is not null and length(_notes) > 500 then raise exception 'Notes are too long'; end if;

  select * into _area from public.delivery_areas where id = _area_id;
  if not found or not _area.enabled then raise exception 'We do not deliver to that area right now'; end if;

  insert into public.orders (user_id, delivery_area_id, delivery_area_name, address, contact_name, contact_phone, notes, subtotal, delivery_fee, total)
  values (_uid, _area.id, _area.name, trim(_address), trim(_contact_name), trim(_contact_phone), nullif(trim(coalesce(_notes,'')),''), 0, 0, 0)
  returning id into _order_id;

  for _it in select * from jsonb_array_elements(_items) loop
    select * into _menu from public.menu_items where id = (_it->>'menu_item_id')::uuid;
    if not found or not _menu.available then raise exception 'An item in your cart is no longer available'; end if;
    _qty := (_it->>'quantity')::int;
    if _qty is null or _qty < 1 or _qty > 20 then raise exception 'Invalid quantity for %', _menu.name; end if;

    select coalesce(array_agg(distinct (x)::uuid), '{}') into _ex_ids
      from jsonb_array_elements_text(coalesce(_it->'extra_ids','[]'::jsonb)) x;
    select count(*), coalesce(sum(price),0), coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'price',price)),'[]')
      into _ex_count, _ex_total, _ex_json
      from public.menu_extras where id = any(_ex_ids) and available;
    if _ex_count <> coalesce(array_length(_ex_ids,1),0) then raise exception 'An extra in your cart is no longer available'; end if;

    _unit := _menu.price + _ex_total;
    insert into public.order_items (order_id, menu_item_id, name, unit_price, quantity, extras, line_total)
    values (_order_id, _menu.id, _menu.name, _unit, _qty, _ex_json, _unit * _qty);
    _subtotal := _subtotal + _unit * _qty;
  end loop;

  update public.orders set subtotal = _subtotal, delivery_fee = 0, total = _subtotal where id = _order_id;
  insert into public.payments (order_id, user_id, amount) values (_order_id, _uid, _subtotal);
  return _order_id;
end; $$;
revoke execute on function public.place_order(jsonb, uuid, text, text, text, text) from public, anon;
grant execute on function public.place_order(jsonb, uuid, text, text, text, text) to authenticated;

create or replace function public.submit_payment_proof(_order_id uuid, _method text, _reference text, _receipt_path text)
returns void language plpgsql security definer set search_path = public
as $$
declare _p public.payments;
begin
  select * into _p from public.payments where order_id = _order_id;
  if not found or _p.user_id <> auth.uid() then raise exception 'Order not found'; end if;
  if _p.status = 'verified' then raise exception 'This payment is already verified'; end if;
  if _method not in ('cbe','telebirr') then raise exception 'Choose CBE or Telebirr'; end if;
  if coalesce(length(trim(_reference)),0) < 4 or length(_reference) > 64 then raise exception 'Please enter the transaction reference'; end if;
  if _receipt_path is not null and split_part(_receipt_path,'/',1) <> auth.uid()::text then raise exception 'Invalid receipt'; end if;
  update public.payments set method = _method, transaction_ref = trim(_reference),
    receipt_path = coalesce(_receipt_path, receipt_path), submitted_at = now(),
    status = 'unverified', review_note = null, reviewed_at = null
  where id = _p.id;
end; $$;
revoke execute on function public.submit_payment_proof(uuid, text, text, text) from public, anon;
grant execute on function public.submit_payment_proof(uuid, text, text, text) to authenticated;

create or replace function public.review_payment(_payment_id uuid, _approve boolean, _note text)
returns void language plpgsql security definer set search_path = public
as $$
declare _p public.payments;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not allowed'; end if;
  select * into _p from public.payments where id = _payment_id;
  if not found then raise exception 'Payment not found'; end if;
  if _p.status = 'verified' then raise exception 'Already verified'; end if;
  if _approve then
    update public.payments set status = 'verified', reviewed_at = now(), review_note = nullif(trim(coalesce(_note,'')),'') where id = _p.id;
    update public.orders set status = 'confirmed', confirmed_at = now() where id = _p.order_id;
  else
    update public.payments set status = 'rejected', reviewed_at = now(), review_note = nullif(trim(coalesce(_note,'')),'') where id = _p.id;
  end if;
end; $$;
revoke execute on function public.review_payment(uuid, boolean, text) from public, anon;
grant execute on function public.review_payment(uuid, boolean, text) to authenticated;

create policy "receipts upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin')));

insert into public.menu_items (name, description, price, image_key, sort_order) values
('TMS Classic', 'Beef patty, cheddar, lettuce, tomato, house sauce.', 350, 'classic', 1),
('Double Smash', 'Two smashed patties, double cheese, pickles, onions.', 520, 'double', 2),
('Berbere Fire', 'Spicy berbere-rubbed beef, jalapeños, awaze mayo.', 450, 'berbere', 3),
('Crispy Chicken', 'Fried chicken thigh, slaw, honey-chili glaze.', 400, 'chicken', 4),
('Veggie Stack', 'Lentil-chickpea patty, avocado, grilled onions.', 320, 'veggie', 5);
insert into public.menu_extras (name, price, sort_order) values
('Extra cheese', 50, 1), ('Extra patty', 150, 2), ('Fries', 100, 3), ('Soft drink', 60, 4), ('Fried egg', 40, 5);
insert into public.delivery_areas (name, sort_order) values
('AAU Sidist Kilo (Main Campus)', 1), ('AAU Arat Kilo (Science)', 2), ('AAU Amist Kilo (Technology)', 3),
('AAU Sefere Selam', 4), ('AAU Commerce (Lideta)', 5), ('AAU Tikur Anbessa (Medicine)', 6);
