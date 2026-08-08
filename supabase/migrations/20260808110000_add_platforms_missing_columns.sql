-- ============================================================
-- إضافة الأعمدة الناقصة لجدول platforms الموجود أصلاً
-- الفرونت إند محتاج description_en/ar وslug (مش uuid) للراوتينج
-- ============================================================

alter table public.platforms
  add column if not exists description_en text,
  add column if not exists description_ar text,
  add column if not exists slug text;

-- Backfill لأي صفوف موجودة أصلاً (لو في) قبل ما نخلي slug unique/not null
update public.platforms
set slug = lower(regexp_replace(name_en, '\s+', '-', 'g'))
where slug is null;

alter table public.platforms
  alter column slug set not null,
  add constraint platforms_slug_unique unique (slug);

create index if not exists platforms_slug_idx on public.platforms(slug);