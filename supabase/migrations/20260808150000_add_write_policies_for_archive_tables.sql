-- supabase/migrations/20260808150000_add_write_policies_for_archive_tables.sql
-- ============================================================
-- ⚠️ إصلاح: الميغريشنز الأولى حطت SELECT policy بس على works/sections/
-- items/files، بافتراض إن كل الكتابة رح تمر عبر RPCs (SECURITY DEFINER).
-- بس الـ Server Actions الفعلية بتكتب مباشرة على الجداول (insert/update)
-- عبر عميل Supabase العادي (خاضع لـRLS) — فكانت الكتابة محظورة بصمت.
--
-- الحل: نضيف INSERT/UPDATE policies بسيطة لأي مستخدم authenticated.
-- فحص الصلاحية الفعلي (عضوية + Manage Archive) صاير أصلاً بطبقة التطبيق
-- (guards.ts) قبل أي استدعاء لهاي الجداول — الـRLS هون بس تفتح الباب
-- التقني، مش بديل عن فحص الصلاحيات.
--
-- الحذف ضل زي ما هو (بدون policy مباشر) لأنه بيمر حصرًا عبر RPCs
-- (delete_work, delete_section...) يلي عندها فحص can_delete_archive()
-- مستقل جوا الدالة نفسها (SECURITY DEFINER بيتخطى RLS).
-- ============================================================

create policy works_insert on public.works
  for insert to authenticated with check (true);
create policy works_update on public.works
  for update to authenticated using (true) with check (true);

create policy sections_insert on public.sections
  for insert to authenticated with check (true);
create policy sections_update on public.sections
  for update to authenticated using (true) with check (true);

create policy items_insert on public.items
  for insert to authenticated with check (true);
create policy items_update on public.items
  for update to authenticated using (true) with check (true);

create policy files_insert on public.files
  for insert to authenticated with check (true);
create policy files_update on public.files
  for update to authenticated using (true) with check (true);