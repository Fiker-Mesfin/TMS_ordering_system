insert into public.delivery_areas (name, sort_order)
values
  ('AAU FBE', 7),
  ('AAU Yared Music School', 8)
on conflict (name) do nothing;
