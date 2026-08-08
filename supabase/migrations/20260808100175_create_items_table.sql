-- ============================================================
-- إنشاء جدول items من الصفر — المستوى الرابع بالهرمية
-- ✅ مؤكد: الجدول مش موجود أصلاً بالداتابيز
-- drive_url هون بيمثّل "رابط المجلد الكامل" (الـ Item صار container،
-- مش رابط ملف مفرد — الملفات الفردية بجدول files لحالها)
-- ============================================================

create table if not exists public.items (
  id           uuid primary key default gen_random_uuid(),
  section_id   uuid not null references public.sections(id) on delete cascade,
  name_en      text not null,
  name_ar      text not null,
  drive_url    text,                    -- رابط المجلد الكامل بالدرايف
  thumbnail_url text,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists items_section_id_idx on public.items(section_id);

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

alter table public.items enable row level security;

create policy items_select on public.items
  for select
  to authenticated
  using (true);