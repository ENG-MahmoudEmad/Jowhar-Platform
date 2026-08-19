-- =====================================================================
-- Migration: حذف كامل (hard delete) لعضو — للديفيلوبر فقط
--
-- المشكلة اللي واجهناها يدويًا اليوم: كل محاولة حذف عضو من auth.users
-- كانت تفشل بـ FK constraint من جدول مختلف (admin_audit_log،
-- notifications...) — ولا يوجد قائمة ثابتة بكل الجداول المرتبطة، وأي
-- جدول جديد يُضاف مستقبلاً (تاسكات، ملاحظات، أرشيف...) بيعيد نفس المشكلة.
--
-- الحل: دالة عامة بتكتشف *ديناميكيًا* كل الجداول اللي فيها FK تشاور على
-- public.profiles(id)، وتحذف الصفوف المرتبطة بالعضو من كل جدول منها،
-- قبل ما تحذف صف profiles نفسه. مرّة واحدة تُكتب، وتغطي أي جدول جديد
-- يُضاف بالمستقبل تلقائيًا بدون تعديل هالدالة.
--
-- ⚠️ هذا حذف نهائي لا رجعة فيه (بخلاف softDeleteMember الموجودة أصلاً
-- لباقي الأدمنية) — محصور بالديفيلوبر فقط، ومفروض من طرف السيرفر
-- بـ hardDeleteMember() بالأكشنز، مش هون بالدالة (الدالة نفسها مسؤولة
-- بس عن التنفيذ الآمن ميكانيكيًا، الصلاحية تُفرض قبل ما توصل هون).
-- =====================================================================

create or replace function public.hard_delete_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if p_member_id is null then
    raise exception 'member_id_required';
  end if;

  -- كل FK بالسكيما public بتشاور على profiles(id) — بما فيها self-references
  -- (approved_by/rejected_by/suspended_by...) وأي جدول جديد يُضاف مستقبلاً.
  -- نستثني profiles نفسها من هالحلقة، وننضفها آخر شي.
  for r in
    select
      tc.table_name,
      kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
     and tc.table_schema = ccu.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_schema = 'public'
      and ccu.table_name = 'profiles'
      and ccu.column_name = 'id'
      and tc.table_name <> 'profiles'
  loop
    execute format(
      'delete from public.%I where %I = $1',
      r.table_name, r.column_name
    ) using p_member_id;
  end loop;

  -- self-references داخل profiles نفسها (approved_by/rejected_by/
  -- suspended_by لأعضاء تانيين بتشاور على هاد العضو) — تنظّف قبل الحذف
  -- الأخير، وإلا الحذف نفسه بيفشل بنفس نوع الخطأ اللي واجهناه اليوم.
  for r in
    select kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
     and tc.table_schema = ccu.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and tc.table_name = 'profiles'
      and ccu.table_schema = 'public'
      and ccu.table_name = 'profiles'
      and ccu.column_name = 'id'
  loop
    execute format(
      'update public.profiles set %I = null where %I = $1',
      r.column_name, r.column_name
    ) using p_member_id;
  end loop;

  delete from public.profiles where id = p_member_id;
end;
$$;

-- التنفيذ محصور بـ service_role (الأكشن بينادي عبر createAdminClient،
-- مش عبر جلسة المستخدم العادية) — احتياط إضافي فوق فحص isDeveloper
-- بالسيرفر.
revoke execute on function public.hard_delete_member(uuid) from public, authenticated, anon;
grant execute on function public.hard_delete_member(uuid) to service_role;