-- supabase/migrations/20260808130000_add_items_missing_columns.sql
-- ============================================================
-- إضافة الأعمدة الناقصة لجدول items — description + tag مستوى العنصر
-- (منفصل عن file_type بجدول files، هاد badge بسيط على مستوى Item نفسه)
-- ============================================================

alter table public.items
  add column if not exists description_en text,
  add column if not exists description_ar text,
  add column if not exists tag text references public.file_types(key);

create index if not exists items_tag_idx on public.items(tag);