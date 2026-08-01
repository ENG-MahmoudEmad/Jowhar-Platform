-- ============================================================
-- Migration 002: Core foundation
-- إعادة هيكلة profiles + Permissions Registry + Suspension
-- Jowhar Platform
-- ============================================================

-- ============================================================
-- 1) مستوى الوصول (access_role) — منفصل تمامًا عن المسمى الوظيفي
-- ============================================================
create type access_role as enum ('member', 'admin');

-- شيل عمود role القديم (كان نص واحد بيخلط بين المفهومين)
alter table public.profiles drop column if exists role;

alter table public.profiles
  -- مستوى الوصول: member أو admin
  add column access_role access_role not null default 'member',

  -- Chief Admin: واحد بس بالنظام كله، ما حدا يقدر يعدّله ولا يوقفه
  add column is_chief boolean not null default false,

  -- المسمى الوظيفي (شي مختلف تمامًا عن access_role)
  -- مثال: Animator / رسام متحرك
  add column job_title_en text,
  add column job_title_ar text,

  -- لون العضو الموحّد بكل الواجهة (يحدده الأدمن فقط)
  add column color text not null default '#0d9488',

  add column avatar_url text,

  -- قيود يفرضها الأدمن على تعديل العضو لبياناته
  add column lock_name boolean not null default false,
  add column lock_avatar boolean not null default false,

  -- الإيقاف المؤقت (Suspend)
  add column is_suspended boolean not null default false,
  add column suspended_until timestamptz,
  add column suspended_by uuid references auth.users(id),

  -- تتبع الرفض
  add column rejected_by uuid references auth.users(id),

  -- قيد تغيير كلمة السر: مرة كل 7 أيام (من البروفايل فقط، مش Forget Password)
  add column last_password_change_at timestamptz,

  -- Soft delete + التنظيف النهائي بعد 90 يوم
  add column deleted_at timestamptz;

-- Chief Admin واحد بس بالنظام كله
create unique index idx_only_one_chief
  on public.profiles (is_chief)
  where is_chief = true;

-- تسريع استعلامات القوائم (استثناء المحذوفين)
create index idx_profiles_active on public.profiles (access_role, status)
  where deleted_at is null;


-- ============================================================
-- 2) Permissions Registry — نظام مركزي واحد للمنصة كلها
-- ============================================================
create table public.permissions (
  key text primary key,
  label_en text not null,
  label_ar text not null,
  category text not null,
  sort_order int not null default 0
);

comment on table public.permissions is
  'سجل الصلاحيات المركزي. إضافة صلاحية جديدة = سطر واحد هون، وبتظهر تلقائيًا بالواجهة';

insert into public.permissions (key, label_en, label_ar, category, sort_order) values
  ('admin.add_task',        'Add Tasks',       'إضافة مهام',       'admin_control', 1),
  ('admin.director_notes',  'Director Notes',  'ملاحظات المدير',   'admin_control', 2),
  ('admin.suspend_member',  'Suspend Members', 'إيقاف الأعضاء',    'admin_control', 3),
  ('archive.manage',        'Manage Archive',  'إدارة الأرشيف',    'archive',       1),
  ('members.manage',        'Manage Members',  'إدارة الأعضاء',    'members',       1),
  ('news.publish',          'Publish News',    'نشر الأخبار',      'news',          1)
on conflict (key) do nothing;


-- ============================================================
-- 3) الصلاحيات الممنوحة لكل عضو
-- ============================================================
create table public.user_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

alter table public.user_permissions enable row level security;


-- ============================================================
-- 4) تتبع محاولات التسجيل المرفوضة (حماية من التكرار المزعج)
-- ============================================================
create table public.signup_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip_address inet,
  rejected_at timestamptz not null default now()
);

create index idx_signup_attempts_email on public.signup_attempts (email, rejected_at);
create index idx_signup_attempts_ip on public.signup_attempts (ip_address, rejected_at);


-- ============================================================
-- 5) طلبات تغيير الإيميل
-- ============================================================
create type email_change_status as enum (
  'pending_admin',              -- بانتظار موافقة الأدمن
  'pending_email_verification'  -- وافق الأدمن، بانتظار تأكيد الإيميل الجديد
);

create table public.email_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  new_email text not null,
  status email_change_status not null default 'pending_admin',
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz
);

comment on column public.email_change_requests.user_id is
  'unique = طلب جديد بيستبدل القديم تلقائيًا، ما فيه تراكم';

alter table public.email_change_requests enable row level security;


-- ============================================================
-- 6) دوال مساعدة (SECURITY DEFINER)
-- مهمة جدًا: بتتخطى RLS داخليًا لتفادي infinite recursion
-- لو استدعينا profiles جوا policy على profiles نفسها
-- ============================================================

create or replace function public.is_active_user(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and status = 'active'
      and deleted_at is null
      and (
        is_suspended = false
        or (suspended_until is not null and suspended_until <= now())
      )
  );
$$;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and access_role = 'admin'
      and status = 'active'
      and deleted_at is null
  );
$$;

create or replace function public.is_chief(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and is_chief = true and deleted_at is null
  );
$$;

create or replace function public.has_permission(uid uuid, perm_key text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_chief(uid)  -- الـ Chief عنده كل شي تلقائيًا
    or exists (
      select 1 from public.user_permissions
      where user_id = uid and permission_key = perm_key
    );
$$;


-- ============================================================
-- 7) قاعدة "مين يقدر يتحكم بمين" (Actor × Target)
-- Chief    -> أي حدا ما عدا نفسه
-- Admin    -> members بس (مش admins ولا chief)
-- أي حدا   -> ما يقدر يتحكم بنفسه
-- ============================================================
create or replace function public.can_manage_member(actor uuid, target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    actor <> target                                  -- ممنوع يتحكم بنفسه
    and not public.is_chief(target)                  -- ممنوع أي حدا يتحكم بالـ Chief
    and (
      public.is_chief(actor)                         -- الـ Chief يتحكم بالكل
      or (
        public.is_admin(actor)
        and exists (                                 -- الأدمن الثانوي: members بس
          select 1 from public.profiles
          where id = target and access_role = 'member'
        )
      )
    );
$$;


-- ============================================================
-- 8) حماية الـ Chief على مستوى قاعدة البيانات
-- ما حدا يقدر يشيل صفة chief، أو يوقفه، أو ينزّل دوره
-- ============================================================
create or replace function public.protect_chief()
returns trigger as $$
begin
  if old.is_chief = true then
    if new.is_chief = false then
      raise exception 'لا يمكن إزالة صفة Chief Admin';
    end if;
    if new.access_role <> 'admin' then
      raise exception 'لا يمكن تغيير دور الـ Chief Admin';
    end if;
    if new.is_suspended = true then
      raise exception 'لا يمكن إيقاف الـ Chief Admin';
    end if;
    if new.deleted_at is not null then
      raise exception 'لا يمكن حذف الـ Chief Admin';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_protect_chief
before update on public.profiles
for each row execute function public.protect_chief();


-- ============================================================
-- 9) تحديث trigger إنشاء المستخدم (بدون عمود role القديم)
-- ============================================================
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


-- ============================================================
-- 10) RLS Policies
-- ============================================================

-- --- profiles ---
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own basic info" on public.profiles;

-- أي عضو نشط يشوف كل الأعضاء (مطلوب للداشبورد، الكاليندر، الأعضاء...)
create policy "Active users can view all profiles"
on public.profiles for select
using (
  deleted_at is null
  and (
    auth.uid() = id                       -- دايمًا يشوف نفسه
    or public.is_active_user(auth.uid())  -- أو نشط فيشوف الباقي
  )
);

-- العضو يعدّل بروفايله هو بس
-- (حماية الحقول الحساسة زي color و access_role بتنفرض بالباك اند/Edge Functions،
--  لأن Postgres RLS ما بتقدر تقيّد أعمدة محددة داخل نفس السياسة)
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- الأدمن يعدّل الأعضاء يلي مسموح له فيهم
create policy "Admins can update managed members"
on public.profiles for update
using (public.can_manage_member(auth.uid(), id));


-- --- permissions (سجل عام للقراءة) ---
alter table public.permissions enable row level security;

create policy "Anyone authenticated can read permissions registry"
on public.permissions for select
to authenticated
using (true);


-- --- user_permissions ---
create policy "Users can view own permissions"
on public.user_permissions for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Only chief or permitted admins can grant"
on public.user_permissions for all
using (public.can_manage_member(auth.uid(), user_id))
with check (public.can_manage_member(auth.uid(), user_id));


-- --- email_change_requests ---
create policy "Users can view own email request"
on public.email_change_requests for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Users can create own email request"
on public.email_change_requests for insert
with check (auth.uid() = user_id);

create policy "Users can delete own pending request"
on public.email_change_requests for delete
using (auth.uid() = user_id);