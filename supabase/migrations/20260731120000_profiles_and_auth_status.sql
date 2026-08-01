-- ============================================================
-- Migration 001: Profiles table + account status + auth triggers
-- Jowhar Platform - Auth Flow
-- ============================================================

-- 1) Enum لحالة الحساب بعد تأكيد الإيميل
-- ملاحظة: حالة "unverified" ما منحطها هون، لأنها موجودة أصلاً
-- عن طريق auth.users.email_confirmed_at (NULL = unverified)
create type account_status as enum ('pending_approval', 'active', 'rejected');

-- 2) جدول profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  status account_status not null default 'pending_approval',
  role text not null default 'member', -- لاحقًا يترتبط بنظام الـ roles تبع Admin Control

  -- تتبع الموافقة/الرفض
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  rejected_at timestamptz,

  -- تتبع آخر resend للـ verification email (لل rate limiting)
  last_verification_resend_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'بيانات إضافية للمستخدم + حالة موافقة الأدمن، مرتبطة بـ auth.users';

-- 3) trigger لتحديث updated_at تلقائيًا
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 4) trigger: عند إنشاء مستخدم جديد بـ auth.users -> ننشئ سجل profile
-- الحالة الافتراضية pending_approval، لكن هي "غير فعالة" فعليًا
-- طالما email_confirmed_at لسا NULL (يعني unverified من ناحية العرض)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'pending_approval'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 5) RLS: تفعيل + سياسات أساسية
alter table public.profiles enable row level security;

-- المستخدم يقدر يشوف بروفايله بس
create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

-- المستخدم يقدر يعدل بروفايله (الاسم فقط - التحكم بباقي الحقول من الأدمن لاحقًا عبر service role)
create policy "Users can update own basic info"
on public.profiles for update
using (auth.uid() = id);

-- ملاحظة: صلاحيات الأدمن (يشوف الكل، يوافق/يرفض) رح تنضاف بـ migration لاحقة
-- بعد ما نبني نظام الـ roles/permissions تبع Admin Control، أو مؤقتًا
-- عن طريق service_role key بالـ Edge Functions (اللي هو الأنسب لعمليات الموافقة).

-- 6) index لتسريع استعلامات الأدمن (فرز حسب created_at، فلترة حسب status)
create index idx_profiles_status_created on public.profiles (status, created_at);