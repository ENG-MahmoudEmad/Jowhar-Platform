-- ============================================================
-- 00: دوال مساعدة عامة — لازم تُطبّق أول شي قبل أي RPC تانية بتستخدمها
-- ⚠️ افتراض: جدول permissions موجود أصلاً بنمط (user_id, permission_key)
-- من مايجريشنز الـ Dashboard السابقة. عدّل اسم الجدول/الأعمدة لو مختلف.
-- ============================================================

-- ⚠️ has_permission(uid, key) موجودة أصلاً بقاعدة البيانات (من نظام الصلاحيات
-- السابق) — ما بنعيد إنشاءها هون. الدوال تحت بتستدعيها زي ما هي.
-- تأكد فقط إن توقيعها الفعلي هو: has_permission(uuid, text) returns boolean
-- ولو الترتيب أو الاسم مختلف، عدّل الاستدعاءات تحت (public.has_permission(...))

-- الحذف محصور بمستوى الحساب (Chief Admin / Developer) — مش قابل للمنح إطلاقًا
create or replace function public.can_delete_archive(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and (p.is_developer = true or p.is_chief = true)
  );
$$;

-- عضوية منصة معينة (طبقة ب) — Chief/Developer يتخطون دايمًا
create or replace function public.is_platform_member(p_user_id uuid, p_platform_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (select 1 from public.profiles p where p.id = p_user_id and (p.is_developer = true or p.is_chief = true))
    or exists (
      select 1 from public.platform_team_members ptm
      where ptm.member_id = p_user_id and ptm.platform_id = p_platform_id
    );
$$;

-- القرار المحسوم: عضوية المنصة شرط مسبق، وManage Archive بتحدد الصلاحيات جوا
create or replace function public.can_manage_archive(p_user_id uuid, p_platform_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_member(p_user_id, p_platform_id)
     and public.has_permission(p_user_id, 'archive.manage');
$$;

create or replace function public.can_copy_move_archive(p_user_id uuid, p_platform_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_member(p_user_id, p_platform_id)
     and public.has_permission(p_user_id, 'archive.copy_move');
$$;