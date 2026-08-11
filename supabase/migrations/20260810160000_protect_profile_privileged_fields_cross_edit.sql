-- supabase/migrations/20260810160000_protect_profile_privileged_fields_cross_edit.sql
--
-- المشكلة: guard_profile_self_update() كانت تفحص الأعمدة الحساسة (access_role,
-- is_chief, ...) بس لما العضو يعدّل على نفسه (auth.uid() = new.id). لما أدمن
-- يعدّل على عضو تاني، الدالة كانت ترجع فورًا بدون أي فحص — واثقة بالكامل إنه
-- Server Actions (rolesActions.ts) هي يلي بتمنع أدمن عادي من ترقية عضو لـ
-- access_role='admin' أو is_chief=true. هاد التعديل بيضيف نفس الفحص كخط دفاع
-- ثاني بالداتابيز لمسار "أدمن يعدّل على غيره" كمان.
--
-- التعديل:
--   • is_chief: ممنوع تغييرها من أي مسار تطبيقي إطلاقًا (نفس منطق is_developer
--     الموجود أصلًا بـ protect_developer_flag) — ما في مسار شرعي بالكود يغيّرها.
--   • access_role: مسموح تغييرها بس لو الـactor نفسه Chief أو Developer —
--     مطابق تمامًا لشرط canEditRoles() الموجود أصلًا بالكود (rolesActions.ts).
--
-- ما تغيّر: كل مسار كان شغال (ترقية من Chief/Developer، تعليق عضو، قفل
-- اسم/صورة، تعديل العضو لنفسه) بيضل يشتغل بالضبط متل ما هو.

create or replace function guard_profile_self_update()
returns trigger
language plpgsql
security definer
as $$
declare
  v_privileged boolean;
  v_actor_privileged boolean;
begin
  -- ═══════════════════════════════════════════════════════════
  -- مسار جديد: أدمن يعدّل على عضو تاني (auth.uid() <> new.id)
  -- ═══════════════════════════════════════════════════════════
  if auth.uid() is not null and auth.uid() <> new.id then
    v_actor_privileged := public.is_chief(auth.uid()) or public.is_developer(auth.uid());

    -- is_chief ممنوع تغييرها من هالمسار مطلقًا — ما في مسار تطبيقي شرعي
    -- يحطها أصلًا (نفس منطق is_developer: SQL يدوي بس).
    if new.is_chief is distinct from old.is_chief then
      raise exception 'is_chief cannot be changed through the application';
    end if;

    -- access_role: حصري لـChief/Developer (مطابق لـcanEditRoles بالكود)
    if new.access_role is distinct from old.access_role and not v_actor_privileged then
      raise exception 'Only chief or developer can change access_role';
    end if;

    return new;
  end if;

  -- ═══════════════════════════════════════════════════════════
  -- المسار الأصلي: العضو بيعدّل على نفسه (بدون تغيير)
  -- ═══════════════════════════════════════════════════════════
  if auth.uid() is null or auth.uid() <> new.id then
    return new;
  end if;

  v_privileged := public.is_chief(new.id) or public.is_developer(new.id);

  if not v_privileged then
    new.color        = old.color;
    new.job_title_en = old.job_title_en;
    new.job_title_ar = old.job_title_ar;
    new.lock_name    = old.lock_name;
    new.lock_avatar  = old.lock_avatar;
  end if;

  new.access_role      = old.access_role;
  new.is_chief         = old.is_chief;
  new.is_developer     = old.is_developer;
  new.status           = old.status;
  new.is_suspended     = old.is_suspended;
  new.suspended_until  = old.suspended_until;
  new.suspended_by     = old.suspended_by;
  new.approved_by      = old.approved_by;
  new.approved_at      = old.approved_at;
  new.rejected_by      = old.rejected_by;
  new.rejected_at      = old.rejected_at;
  new.deleted_at       = old.deleted_at;

  if not v_privileged then
    if old.lock_name and
       (new.first_name is distinct from old.first_name
        or new.last_name is distinct from old.last_name) then
      raise exception 'name_locked';
    end if;
    if old.lock_avatar and new.avatar_url is distinct from old.avatar_url then
      raise exception 'avatar_locked';
    end if;
  end if;

  return new;
end;
$$;