-- supabase/migrations/20260808120000_add_slug_to_works.sql
-- ============================================================
-- إضافة slug لجدول works — للراوتينج /archive/[platformSlug]/[workSlug]
-- فريد لكل منصة (مش عالميًا)، لأنه ممكن منصتين مختلفتين تستخدموا
-- نفس اسم العمل (مثلاً "الفيلم الأول" بمنصتين مختلفتين)
-- ============================================================

alter table public.works
  add column if not exists slug text;

update public.works
set slug = lower(regexp_replace(name_en, '\s+', '-', 'g'))
where slug is null;

alter table public.works
  alter column slug set not null,
  add constraint works_platform_slug_unique unique (platform_id, slug);

create index if not exists works_slug_idx on public.works(slug);