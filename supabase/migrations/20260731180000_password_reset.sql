-- ============================================================
-- Migration 004: Password reset flow
-- ============================================================

alter table public.profiles
  add column last_password_reset_request_at timestamptz;


-- ============================================================
-- دالة واحدة بتقرر: هل نرسل رابط استرجاع لهذا الإيميل؟
--
-- ليش SECURITY DEFINER: لأنها بتقرأ auth.users (مش متاح عادةً)
-- ليش ترجع boolean بس: عشان ما تكشف أي تفصيل عن سبب الرفض
--   (مش موجود / pending / rejected / موقوف / طلب قريب) — كلهم false
-- ============================================================
create or replace function public.request_password_reset(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_last_request timestamptz;
  v_status account_status;
  v_suspended boolean;
  v_suspended_until timestamptz;
  v_deleted timestamptz;
begin
  -- نجيب المستخدم من auth.users حسب الإيميل
  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
    and u.email_confirmed_at is not null   -- لازم يكون أكّد إيميله أصلاً
  limit 1;

  if v_user_id is null then
    return false;
  end if;

  select p.status, p.is_suspended, p.suspended_until,
         p.deleted_at, p.last_password_reset_request_at
    into v_status, v_suspended, v_suspended_until,
         v_deleted, v_last_request
  from public.profiles p
  where p.id = v_user_id;

  -- الحساب لازم يكون active وغير محذوف
  if v_status is distinct from 'active' or v_deleted is not null then
    return false;
  end if;

  -- إيقاف مؤقت لسا ساري
  if v_suspended = true
     and (v_suspended_until is null or v_suspended_until > now()) then
    return false;
  end if;

  -- Rate limit: ما ينفع طلب جديد قبل ما تمر 10 دقائق
  if v_last_request is not null
     and v_last_request > now() - interval '10 minutes' then
    return false;
  end if;

  -- مسموح: نسجّل وقت الطلب ونوافق
  update public.profiles
  set last_password_reset_request_at = now()
  where id = v_user_id;

  return true;
end;
$$;

-- الدالة تُستدعى من السيرفر فقط (service_role)، مش من المتصفح
revoke execute on function public.request_password_reset(text) from anon, authenticated;
grant execute on function public.request_password_reset(text) to service_role;


-- ============================================================
-- تسجيل وقت آخر تغيير فعلي لكلمة السر
-- (يُستخدم لقيد "مرة كل 7 أيام" من صفحة البروفايل — Profile spec)
-- ============================================================
create or replace function public.stamp_password_change(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set last_password_change_at = now()
  where id = p_user_id;
$$;

grant execute on function public.stamp_password_change(uuid) to authenticated, service_role;