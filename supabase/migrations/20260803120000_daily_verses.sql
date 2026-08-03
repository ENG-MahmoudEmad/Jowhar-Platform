-- migration: 20260803120000_daily_verses.sql
-- المكان: supabase/migrations/20260803120000_daily_verses.sql
-- شغّلها بـ: supabase db push

create table public.daily_verses (
  id            serial primary key,
  surah_number  smallint not null,
  ayah_number   smallint not null,
  surah_name_ar text not null,
  surah_name_en text not null,
  arabic_text   text not null,
  theme         text,
  created_at    timestamptz not null default now(),
  unique (surah_number, ayah_number)
);

alter table public.daily_verses enable row level security;

create policy "authenticated users can read verses"
  on public.daily_verses for select
  to authenticated
  using (true);

-- ⚠️ تحذير Lesson #1: db push ما بيعطي GRANT تلقائيًا — لازم تنكتب يدوي
grant select on public.daily_verses to authenticated;