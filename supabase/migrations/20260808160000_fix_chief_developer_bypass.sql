-- supabase/migrations/20260808160000_fix_chief_developer_bypass.sql
-- ============================================================
-- إصلاح: can_manage_archive() وcan_copy_move_archive() كانوا بيعتمدوا على
-- public.has_permission() الموجودة أصلاً بالمشروع — وهاي الدالة (قديمة،
-- مش من صنعنا) ما فيها تجاوز تلقائي لـChief/Developer، عكس الطبقة الموازية
-- بالفرونت إند (hasCapability بـguards.ts) يلي بتتجاوز فيهم صراحة.
--
-- النتيجة: حتى Chief/Developer كانوا محتاجين صف صريح بـuser_permissions
-- لمفتاح 'archive.copy_move' (وهو مفتاح جديد أضفناه، طبيعي محدا عنده
-- صف له بعد) — فكانت العملية دايمًا بترفض حتى لأصحاب أعلى صلاحية.
--
-- الحل: نخلي دالتينا تتجاوزوا Chief/Developer مباشرة (فحص profiles)،
-- مش بالاعتماد على تجاوز داخلي مجهول بدالة has_permission القديمة.
-- ============================================================

create or replace function public.can_manage_archive(p_user_id uuid, p_platform_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (select 1 from public.profiles p where p.id = p_user_id and (p.is_developer = true or p.is_chief = true))
    or (
      public.is_platform_member(p_user_id, p_platform_id)
      and public.has_permission(p_user_id, 'archive.manage')
    );
$$;

create or replace function public.can_copy_move_archive(p_user_id uuid, p_platform_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (select 1 from public.profiles p where p.id = p_user_id and (p.is_developer = true or p.is_chief = true))
    or (
      public.is_platform_member(p_user_id, p_platform_id)
      and public.has_permission(p_user_id, 'archive.copy_move')
    );
$$;