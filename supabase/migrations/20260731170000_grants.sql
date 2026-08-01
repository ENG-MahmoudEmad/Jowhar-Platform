-- ============================================================
-- Migration 003: Table-level grants
-- ============================================================
-- الجداول اللي بتتعمل عن طريق supabase CLI ما بتاخد الصلاحيات
-- الافتراضية اللي Supabase بتعطيها، فلازم نمنحها صراحة.
--
-- ملاحظة أمنية: منح SELECT/INSERT/... لـ authenticated ما بيعني
-- إنه أي مستخدم بيشوف كل شي — الـ RLS هي اللي بتحدد أي صفوف
-- بالضبط. هاي طبقتين مختلفتين:
--   GRANT = هل مسموح تلمس الجدول؟
--   RLS   = أي صفوف مسموح تشوف/تعدّل؟
-- ============================================================

-- الوصول للـ schema نفسه
grant usage on schema public to anon, authenticated, service_role;

-- الجداول الموجودة حاليًا
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- الـ sequences (للأعمدة التسلسلية لو استخدمناها لاحقًا)
grant usage, select on all sequences in schema public to authenticated, service_role;

-- الدوال (is_admin, has_permission, can_manage_member...)
grant execute on all functions in schema public to authenticated, service_role;


-- ============================================================
-- الصلاحيات الافتراضية لأي جداول/دوال نعملها مستقبلًا
-- (عشان ما نرجع نتعثر بنفس المشكلة كل migration جديدة)
-- ============================================================
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant all on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;

alter default privileges in schema public
  grant execute on functions to authenticated, service_role;