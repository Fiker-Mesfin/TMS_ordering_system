update public.menu_extras
set price = 35, available = true, sort_order = 6
where lower(trim(name)) = 'burger sauce';

insert into public.menu_extras (name, price, sort_order)
select 'Burger sauce', 35, 6
where not exists (
  select 1 from public.menu_extras where lower(trim(name)) = 'burger sauce'
);

update public.menu_extras
set price = 25, available = true, sort_order = 7
where lower(trim(name)) = 'ketchup';

insert into public.menu_extras (name, price, sort_order)
select 'Ketchup', 25, 7
where not exists (
  select 1 from public.menu_extras where lower(trim(name)) = 'ketchup'
);
