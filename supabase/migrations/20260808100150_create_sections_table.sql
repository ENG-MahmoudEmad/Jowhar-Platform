-- ============================================================
-- إنشاء جدول sections من الصفر — المستوى الثالث بالهرمية
-- ✅ مؤكد: الجدول مش موجود أصلاً بالداتابيز (فحصنا information_schema)
-- work_id والأيقونة مدمجين مباشرة بالإنشاء (بدل ALTER لاحقة)
-- ============================================================

create table if not exists public.sections (
  id              uuid primary key default gen_random_uuid(),
  work_id         uuid not null references public.works(id) on delete cascade,
  name_en         text not null,
  name_ar         text not null,
  description_en  text,
  description_ar  text,
  icon            text not null default 'folder'
    check (icon in (
      'folder','video','image','music','file','palette',
      'film','mic','archive','layers','sparkles','camera','pen'
    )),
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists sections_work_id_idx on public.sections(work_id);

drop trigger if exists sections_set_updated_at on public.sections;
create trigger sections_set_updated_at
  before update on public.sections
  for each row execute function public.set_updated_at();

alter table public.sections enable row level security;

create policy sections_select on public.sections
  for select
  to authenticated
  using (true);