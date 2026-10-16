-- Service catalogue images uploaded from the admin service form.

alter table public.services add column if not exists image_path text;
alter table public.services drop constraint if exists services_image_path_check;
alter table public.services add constraint services_image_path_check
  check (image_path is null or (char_length(image_path) between 1 and 256 and image_path like 'services/%'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('service-images', 'service-images', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read is provided by the public bucket; uploads remain restricted to admins.
drop policy if exists "KaamSet admins upload service images" on storage.objects;
create policy "KaamSet admins upload service images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'service-images' and name like 'services/%' and public.is_admin());
