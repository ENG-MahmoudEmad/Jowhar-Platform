-- ============================================================
-- 04: جدول Files — المستوى الخامس، الملف الفردي الفعلي داخل Item
-- ============================================================

create table if not exists public.files (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.items(id) on delete cascade,
  name_en      text not null,
  name_ar      text not null,
  drive_url    text not null,              -- رابط الملف الفردي (مختلف عن رابط مجلد الـ Item)
  file_type    text not null references public.file_types(key),
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists files_item_id_idx on public.files(item_id);
create index if not exists files_file_type_idx on public.files(file_type);

drop trigger if exists files_set_updated_at on public.files;
create trigger files_set_updated_at
  before update on public.files
  for each row execute function public.set_updated_at();

alter table public.files enable row level security;

create policy files_select on public.files
  for select
  to authenticated
  using (true);

-- ⚠️ ترتيب تنفيذ: هاي الميغريشن لازم تجي بعد 06_create_file_types_table.sql
-- (الاعتماد بـ foreign key). لو التنفيذ عبر Supabase CLI بالترتيب الزمني
-- بالاسم، لاحظ إن رقم 04 قبل 06 هون — استخدم الأرقام يلي بآخر الملف
-- (تايم ستامب فعلي وقت التطبيق) مش الترقيم التوضيحي هاد.