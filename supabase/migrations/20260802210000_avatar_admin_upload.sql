-- =====================================================================
-- Migration 015: الـ Chief والـ Developer يرفعوا صورة لأي عضو
--
-- سياسة 012 كانت: "ارفع بمجلدك أنت فقط" — بسيطة وآمنة، بس بتمنع
-- الأدمن من رفع صورة نيابة عن عضو، وهي حاجة حقيقية (عضو ما بيعرف
-- يرفع، أو صورة موحّدة للفريق).
--
-- التوسعة بتستعمل `can_edit_identity` — نفس الدالة اللي بتحكم اللون
-- والمسمّى. الصورة جزء من الهوية، فمنطقي تمشي بنفس القاعدة بالضبط
-- بدل قاعدة ثالثة تنحرف عنها لاحقًا (درس #9).
-- =====================================================================

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and public.can_edit_identity(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and public.can_edit_identity(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and public.can_edit_identity(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
  );

-- ---------------------------------------------------------------------
-- ⚠️ `can_edit_identity` كانت بتغطي الـ Chief/Developer فقط.
-- العضو العادي لازم يضل يرفع صورته هو (إلا لو `lock_avatar` مفعّل).
-- ---------------------------------------------------------------------

create or replace function public.can_edit_identity(actor uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select
    -- الـ Chief والـ Developer: هوية أي عضو عادي + هوية نفسهم،
    -- بس ما يعدّلوا هوية بعض
    (
      (public.is_chief(actor) or public.is_developer(actor))
      and (
        actor = target
        or (not public.is_chief(target) and not public.is_developer(target))
      )
    )
    -- أي عضو: هويته هو. القفل بيتفحص بمكانه (trigger البروفايل)،
    -- مش هون — التخزين ما بيعرف شي عن lock_avatar.
    or actor = target;
$function$;