-- ============================================================
-- 01: جدول Works — المستوى الثاني بالهرمية (Platform → Work → ...)
-- ============================================================

create table if not exists public.works (
  id           uuid primary key default gen_random_uuid(),
  platform_id  uuid not null references public.platforms(id) on delete cascade,
  name_en      text not null,
  name_ar      text not null,
  description_en text,
  description_ar text,
  image_url    text,                         -- Supabase Storage public URL
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- اللون موروث من المنصة الأب دايمًا (لا يوجد عمود لون هون بقصد)

create index if not exists works_platform_id_idx on public.works(platform_id);

-- updated_at تلقائي
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists works_set_updated_at on public.works;
create trigger works_set_updated_at
  before update on public.works
  for each row execute function public.set_updated_at();

alter table public.works enable row level security;

-- قراءة: أي مستخدم مسجّل دخول (القفل الفعلي حسب عضوية المنصة بيتفحص بالتطبيق/RPC، مو هون)
create policy works_select on public.works
  for select
  to authenticated
  using (true);

-- الإضافة/التعديل/الحذف عبر RPCs بصلاحية SECURITY DEFINER (بالأسفل بملفات لاحقة)
-- ما في INSERT/UPDATE/DELETE policy مباشر للمستخدم العادي — كل شي بيمر عبر RPC يتحقق الصلاحيات يدويًا