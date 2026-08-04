-- migration: 20260803121600_tasks_realtime.sql
-- المكان: supabase/migrations/20260803121600_tasks_realtime.sql
-- شغّلها بـ: supabase db push (تأكد إنها آخر مايجريشن بالترتيب عندك قبل)

-- Realtime بـ Supabase بيحتاج الجدول يكون مضاف صراحة لقناة النشر
-- (publication) عشان يبعت تحديثات لحظية للمشتركين. الشرط هون بيمنع
-- خطأ "already member of publication" لو كانت مضافة أصلاً من قبل.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- تجربة بالـ SQL Editor بعد التشغيل:
--
--   select tablename from pg_publication_tables
--   where pubname = 'supabase_realtime' and schemaname = 'public';
--
--   لازم "tasks" تكون موجودة بالقائمة يلي بترجع.
-- ─────────────────────────────────────────────────────────────