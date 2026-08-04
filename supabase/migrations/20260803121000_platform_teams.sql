-- migration: 20260803121000_platform_teams.sql
-- المكان: supabase/migrations/20260803121000_platform_teams.sql
-- شغّلها بـ: supabase db push (تأكد إنها آخر مايجريشن بالترتيب عندك قبل)

-- ─────────────────────────────────────────────────────────────
-- 1. platforms — مشتركة مستقبلاً مع صفحة الأرشيف (نفس الجدول بالضبط).
--    فاضية لحد هلق لأنه الأرشيف لسا مش مبني — بتتعبى لاحقًا من هناك.
-- ─────────────────────────────────────────────────────────────
create table public.platforms (
  id            uuid primary key default gen_random_uuid(),
  name_en       text not null,
  name_ar       text not null,
  color         text not null default '#458482',
  thumbnail_url text,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 2. platform_team_categories — تصنيفات داخل كل platform
--    (Supervisor / Members / أي تصنيف مخصص يضيفه الأدمن).
--    منفصلة تمامًا عن هرمية Section/Item تبعت الأرشيف.
-- ─────────────────────────────────────────────────────────────
create table public.platform_team_categories (
  id          uuid primary key default gen_random_uuid(),
  platform_id uuid not null references public.platforms(id) on delete cascade,
  label_en    text not null,
  label_ar    text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_platform_team_categories_platform on public.platform_team_categories(platform_id);

-- ─────────────────────────────────────────────────────────────
-- 3. platform_team_members — ربط عضو↔تصنيف↔platform.
--    unique(platform_id, member_id): العضو بمكان واحد بس داخل نفس
--    الـ platform (مطابق لمنطق allUsedIds بالفرونت الأصلي — العضو
--    ما بيتكرر بأكتر من تصنيف بنفس المنصة).
-- ─────────────────────────────────────────────────────────────
create table public.platform_team_members (
  id          uuid primary key default gen_random_uuid(),
  platform_id uuid not null references public.platforms(id) on delete cascade,
  category_id uuid not null references public.platform_team_categories(id) on delete cascade,
  member_id   uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (platform_id, member_id)
);

create index idx_platform_team_members_category on public.platform_team_members(category_id);
create index idx_platform_team_members_member on public.platform_team_members(member_id);

-- ─────────────────────────────────────────────────────────────
-- RLS: قراءة لكل الفريق (عشان الكل يعرف مين شغال وين)، وتعديل بس
-- لحامل صلاحية platforms.manage (أو Chief/Developer ضمنيًا عبر نفس
-- الدالة المستخدمة بباقي النظام).
-- ─────────────────────────────────────────────────────────────
alter table public.platforms enable row level security;
alter table public.platform_team_categories enable row level security;
alter table public.platform_team_members enable row level security;

create policy "authenticated can read platforms"
  on public.platforms for select
  to authenticated
  using (true);

create policy "platforms.manage can write platforms"
  on public.platforms for all
  to authenticated
  using (public.has_admin_capability('platforms.manage'))
  with check (public.has_admin_capability('platforms.manage'));

create policy "authenticated can read platform categories"
  on public.platform_team_categories for select
  to authenticated
  using (true);

create policy "platforms.manage can write platform categories"
  on public.platform_team_categories for all
  to authenticated
  using (public.has_admin_capability('platforms.manage'))
  with check (public.has_admin_capability('platforms.manage'));

create policy "authenticated can read platform members"
  on public.platform_team_members for select
  to authenticated
  using (true);

create policy "platforms.manage can write platform members"
  on public.platform_team_members for all
  to authenticated
  using (public.has_admin_capability('platforms.manage'))
  with check (public.has_admin_capability('platforms.manage'));

-- ⚠️ تحذير Lesson #1: db push ما بيعطي GRANT تلقائيًا
grant select on public.platforms to authenticated;
grant select on public.platform_team_categories to authenticated;
grant select on public.platform_team_members to authenticated;
grant insert, update, delete on public.platforms to authenticated;
grant insert, update, delete on public.platform_team_categories to authenticated;
grant insert, update, delete on public.platform_team_members to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. الصلاحية الجديدة بسجل الصلاحيات — عشان تظهر بصفحة
--    Roles & Permissions بالـ Admin Control ويقدر الـ Chief/Developer
--    يمنحوها لأدمن ثانوي.
-- ─────────────────────────────────────────────────────────────
insert into public.permissions (key, label_en, label_ar, category, sort_order)
values ('platforms.manage', 'Manage Platforms', 'إدارة المنصات', 'dashboard', 1)
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────
-- تجربة بالـ SQL Editor بعد التشغيل:
--
--   select * from permissions where key = 'platforms.manage';
--   -- لازم يرجع صف واحد
--
--   select count(*) from platforms;
--   -- لازم يرجع 0 (طبيعي، فاضي لحد هلق)
--
-- ⚠️ لو طلعلك خطأ "function has_admin_capability does not exist"،
-- هاد معناه اسم الدالة عندك مختلف شوي — دوّر عليها:
--
--   select proname from pg_proc where proname ilike '%admin_capability%';
--
-- وابعتلي الاسم الصحيح لعدّل المايجريشن.
-- ─────────────────────────────────────────────────────────────