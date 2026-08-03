-- =====================================================================
-- Migration 020: تأجيل إشعار "طلب تسجيل" لحد ما يتأكد الإيميل فعليًا
--
-- المشكلة: صف `profiles` بينعمل فورًا لحظة التسجيل (trigger
-- `handle_new_user` بمايجريشن 001) — بنفس لحظة إنشاء `auth.users`،
-- قبل أي تأكيد. فالإشعار كان بيتبث للأدمنية أول ما حدا يكتب بياناته،
-- حتى لو الإيميل وهمي أو غلط ومحدش أكّده أبدًا.
--
-- ما في عمود تأكيد بجدول `profiles` أصلًا — الإشارة الحقيقية الوحيدة
-- هي `auth.users.email_confirmed_at`، فاضي لحد ما يضغط رابط التأكيد.
--
-- الحل: ننقل لحظة الإشعار من INSERT على `profiles` إلى تحوّل
-- `email_confirmed_at` من null لقيمة فعلية على `auth.users` — نفس نمط
-- `handle_new_user` الموجود أصلًا، فمش سابقة جديدة بالمشروع.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. شيل البث من فرع الـ INSERT — التأكيد هو اللي بيتولى الأمر هلق
-- ---------------------------------------------------------------------

create or replace function public.trg_notify_account_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key    text := 'signup:' || new.id::text;
  v_name   text := btrim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, ''));
  v_actor  uuid;
  v_type   public.notification_type;
  v_href   text;
begin
  /*
    فرع الـ INSERT بلا بث هلق — شوف trg_notify_signup_after_confirm
    تحت، هي المسؤولة عن اللحظة الصح.
  */
  if tg_op = 'INSERT' then
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status = 'pending_approval' and new.status in ('active', 'rejected') then
    v_actor := coalesce(new.approved_by, new.rejected_by);

    perform public.resolve_notification_group(v_key, v_actor);
    perform public.notify_permitted(
      'members.manage',
      'signup_resolved'::public.notification_type,
      v_actor,
      'profile', new.id, v_name, '/adminControl', null, v_actor
    );

    if new.status = 'active' then
      v_type := 'account_approved';
      v_href := '/dashboard';
    else
      v_type := 'account_rejected';
      v_href := '/login';
    end if;

    perform public.notify_user(
      new.id, v_type, v_actor, 'profile', new.id, '', v_href
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. البث الفعلي — بعد تأكيد الإيميل، على auth.users
-- ---------------------------------------------------------------------

create or replace function public.trg_notify_signup_after_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_key     text;
  v_name    text;
begin
  select id, first_name, last_name, status
    into v_profile
    from public.profiles
   where id = new.id;

  -- الصف لسا ما اتعمل (نظريًا مستحيل بترتيب الـ triggers، بس حماية إضافية)
  if v_profile.id is null then
    return new;
  end if;

  -- لو الأدمن وافق/رفض قبل ما العضو يأكد إيميله أصلاً — ما في داعي بث
  if v_profile.status <> 'pending_approval' then
    return new;
  end if;

  v_key  := 'signup:' || v_profile.id::text;
  v_name := btrim(coalesce(v_profile.first_name, '') || ' ' || coalesce(v_profile.last_name, ''));

  perform public.notify_permitted(
    'members.manage',
    'signup_pending'::public.notification_type,
    v_profile.id,
    'profile', v_profile.id, v_name,
    '/adminControl#pending-approvals',
    v_key
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_signup_after_confirm on auth.users;
create trigger trg_notify_signup_after_confirm
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.trg_notify_signup_after_confirm();