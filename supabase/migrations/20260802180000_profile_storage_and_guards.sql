-- =====================================================================
-- Migration 012: تخزين الصور الشخصية + حماية أعمدة البروفايل
--
-- الجزء الثاني هو الأهم: لحد الآن ما في شي بيمنع العضو من تعديل لونه
-- أو فك أقفاله بنفسه عبر استدعاء مباشر للـ API. الواجهة بتخفي الأزرار،
-- بس الإخفاء مش حماية.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Storage bucket للصور الشخصية
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,                                    -- القراءة عامة: الصور بتظهر بكل المنصة
  2097152,                                 -- 2MB — نفس حد المواصفات
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/*
  مسار الملف: {user_id}/{timestamp}.{ext}
  المجلد الأول لازم يكون uuid صاحب الصورة — هيك السياسة بتقدر تتحقق
  من الملكية من غير جدول وسيط.
*/

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- 2. حماية أعمدة البروفايل من التعديل الذاتي
-- ---------------------------------------------------------------------

create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- التعديلات الإدارية (من Server Actions بتفحص الصلاحيات) بتمر عادي
  if auth.uid() is null or auth.uid() <> new.id then
    return new;
  end if;

  /*
    من هون وتحت: العضو بيعدّل على نفسه.
    الأعمدة الحساسة لازم ترجع لقيمتها القديمة مهما بعت بالطلب —
    الرفض بـ exception كان بيكسر أي تحديث بريء بيبعت الصف كامل.
  */
  new.color            = old.color;            -- اللون حصري للأدمن
  new.lock_name        = old.lock_name;
  new.lock_avatar      = old.lock_avatar;
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
  new.job_title_en     = old.job_title_en;
  new.job_title_ar     = old.job_title_ar;

  -- الأقفال: لو الأدمن قافل الاسم أو الصورة، التعديل بينرفض صراحةً
  -- (هون الرفض مناسب لأن المستخدم قصد يعدّل شي ممنوع عليه)
  if old.lock_name and
     (new.first_name is distinct from old.first_name
      or new.last_name is distinct from old.last_name) then
    raise exception 'name_locked';
  end if;

  if old.lock_avatar and new.avatar_url is distinct from old.avatar_url then
    raise exception 'avatar_locked';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_profile_self_update on public.profiles;
create trigger trg_guard_profile_self_update
  before update on public.profiles
  for each row execute function public.guard_profile_self_update();

-- ---------------------------------------------------------------------
-- 3. الإيقاف المؤقت المنتهي = مش إيقاف
-- ---------------------------------------------------------------------

/*
  `is_suspended` لحاله بيكذب بعد انتهاء المدة: بيضل true لحد ما حدا
  يفحصه وقت الـ login. أي مكان تاني بيقرأ العمود مباشرة بيعتبر العضو
  موقوفًا وهو مش موقوف.
*/
create or replace function public.is_effectively_suspended(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and p.is_suspended is true
      and (p.suspended_until is null or p.suspended_until > now())
  );
$$;

grant execute on function public.is_effectively_suspended(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. الحذف النهائي بعد 90 يوم
-- ---------------------------------------------------------------------

/*
  الدالة جاهزة، بس الجدولة بتحتاج pg_cron (Supabase Pro).
  عند الترقية شغّل:
    select cron.schedule('purge-deleted', '0 3 * * *', 'select public.purge_deleted_profiles()');
*/
create or replace function public.purge_deleted_profiles()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with purged as (
    delete from auth.users u
    using public.profiles p
    where p.id = u.id
      and p.deleted_at is not null
      and p.deleted_at < now() - interval '90 days'
    returning u.id
  )
  select count(*) into v_count from purged;

  return v_count;
end;
$$;