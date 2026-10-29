insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-photos',
  'menu-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "menu photos public read" on storage.objects;
create policy "menu photos public read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'menu-photos');

drop policy if exists "menu photos admin insert" on storage.objects;
create policy "menu photos admin insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'menu-photos' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "menu photos admin update" on storage.objects;
create policy "menu photos admin update" on storage.objects
for update to authenticated
using (bucket_id = 'menu-photos' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'menu-photos' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "menu photos admin delete" on storage.objects;
create policy "menu photos admin delete" on storage.objects
for delete to authenticated
using (bucket_id = 'menu-photos' and public.has_role(auth.uid(), 'admin'));
