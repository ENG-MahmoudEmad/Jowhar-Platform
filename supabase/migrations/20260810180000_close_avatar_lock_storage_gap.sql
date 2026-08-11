-- =====================================================================
-- Migration: سد ثغرة رفع صورة لمجلد الـ Storage حتى لو lock_avatar مفعّل
--
-- المشكلة: can_edit_identity(actor, target) بترجع true دايمًا لما
-- actor = target (العضو يرفع لنفسه)، بدون ما تفحص profiles.lock_avatar.
-- الرفع الفعلي بينرفض بعدين على مستوى trigger على profiles، بس الملف
-- نفسه بيكون خلاص انرفع للـ Storage (صورة يتيمة، استهلاك مساحة).
--
-- الحل: دالة جديدة can_upload_avatar تلف حول can_edit_identity وتضيف
-- شرط: لو actor = target (رفع ذاتي) لازم lock_avatar يكون false.
-- الأدمن (actor != target) يضل يقدر يرفع بغض النظر عن القفل — نفس
-- سلوك التريغر الحالي بالضبط (القفل بيمنع العضو نفسه بس).
-- =====================================================================

create or replace function public.can_upload_avatar(actor uuid, target uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_locked boolean;
begin
  if not public.can_edit_identity(actor, target) then
    return false;
  end if;

  -- رفع ذاتي فقط هو اللي بيتفحص فيه القفل — نفس منطق trg_guard_profile_self_update
  if actor = target then
    select lock_avatar into v_locked from public.profiles where id = target;
    if coalesce(v_locked, false) then
      return false;
    end if;
  end if;

  return true;
end;
$function$;

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and public.can_upload_avatar(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and public.can_upload_avatar(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
  );

-- الحذف يضل بنفس شرط can_edit_identity القديم (بدون فحص lock) —
-- حذف صورة قديمة ما بيغيّر حالة العرض الحالية، فمش له نفس الحساسية.
-- (السياسة الحالية avatars_owner_delete من ميغريشن 015 بتضل كما هي)

-- ---------------------------------------------------------------------
-- تجربة بعد التشغيل:
--   1. فعّل lock_avatar = true لعضو تجريبي من adminControl
--   2. حاول ترفع صورة من حساب هذا العضو نفسه → لازم يترفض على مستوى
--      الـ Storage مباشرة (قبل ما يوصل حتى لـ updateMyAvatar)
--   3. بنفس الوقت، جرّب كـ Chief/Developer ترفع صورة لنفس العضو
--      المقفول → لازم تنجح عادي (override الأدمن يضل شغال)
-- ---------------------------------------------------------------------