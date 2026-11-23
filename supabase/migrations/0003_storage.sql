-- 0003 · Private storage buckets and policies.
-- slips:    <student_id>/<week_start>/<uuid>.<ext>  (student uploads own; committee reads all)
-- receipts: expense receipts                         (committee only)
-- settings: bank QR image                            (all signed-in read; committee writes)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('slips', 'slips', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('settings', 'settings', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists slips_insert_own on storage.objects;
create policy slips_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'slips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists slips_select on storage.objects;
create policy slips_select on storage.objects for select to authenticated
  using (
    bucket_id = 'slips'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_committee())
  );

drop policy if exists receipts_committee on storage.objects;
create policy receipts_committee on storage.objects for all to authenticated
  using (bucket_id = 'receipts' and public.is_committee())
  with check (bucket_id = 'receipts' and public.is_committee());

drop policy if exists settings_read on storage.objects;
create policy settings_read on storage.objects for select to authenticated
  using (bucket_id = 'settings');

drop policy if exists settings_write on storage.objects;
create policy settings_write on storage.objects for insert to authenticated
  with check (bucket_id = 'settings' and public.is_committee());

drop policy if exists settings_update on storage.objects;
create policy settings_update on storage.objects for update to authenticated
  using (bucket_id = 'settings' and public.is_committee())
  with check (bucket_id = 'settings' and public.is_committee());

drop policy if exists settings_delete on storage.objects;
create policy settings_delete on storage.objects for delete to authenticated
  using (bucket_id = 'settings' and public.is_committee());
