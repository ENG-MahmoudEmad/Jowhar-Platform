-- supabase/migrations/20260808180000_create_archive_storage_bucket.sql
-- ============================================================
-- Bucket عام (public) لصور الأرشيف (Platform/Work/Item thumbnails).
-- عام بمعنى: أي حدا معه الرابط يقدر يشوف الصورة (زي أي رابط صورة عادي)،
-- بس الرفع/التعديل/الحذف محصور بمستخدمين مسجّلين دخول فقط.
-- حد الحجم (2MB) بينفرض بالـServer Action وقت الرفع، مش هون.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('archive', 'archive', true)
on conflict (id) do nothing;

create policy archive_bucket_select on storage.objects
  for select
  using (bucket_id = 'archive');

create policy archive_bucket_insert on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'archive');

create policy archive_bucket_update on storage.objects
  for update
  to authenticated
  using (bucket_id = 'archive')
  with check (bucket_id = 'archive');

create policy archive_bucket_delete on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'archive');