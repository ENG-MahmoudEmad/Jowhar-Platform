-- ============================================================
-- 05 (تنفيذ قبل جدول files): file_types — registry ديناميكي
-- بدل enum ثابت. مشترك بين مستوى Item ومستوى File (نفس الجدول).
-- ============================================================

create table if not exists public.file_types (
  key        text primary key,        -- محفوظ بحروف كابيتال، مثال 'PSD'
  color      text not null,           -- hex
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.file_types enable row level security;

create policy file_types_select on public.file_types
  for select
  to authenticated
  using (true);

-- الأنواع الافتراضية المزروعة بالفرونت إند — نفس الألوان بالضبط
insert into public.file_types (key, color) values
  ('AE',    '#9999FF'),
  ('PNG',   '#4A9EFF'),
  ('MP4',   '#FF6B6B'),
  ('PDF',   '#FF4444'),
  ('BLEND', '#F5792A')
on conflict (key) do nothing;

-- إضافة نوع جديد لازم تمر عبر RPC (add_file_type) عشان رسالة
-- "هذا النوع موجود أصلاً" واضحة بدل خطأ قاعدة بيانات خام
create or replace function public.add_file_type(p_key text, p_color text)
returns public.file_types
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.file_types;
begin
  -- أي مستخدم عنده Manage Archive يقدر يضيف نوع جديد (نفس صلاحية الإضافة العادية)
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_developer or public.has_permission(auth.uid(), 'archive.manage'))
  ) then
    raise exception 'ليس لديك صلاحية Manage Archive';
  end if;

  insert into public.file_types (key, color, created_by)
  values (upper(p_key), p_color, auth.uid())
  on conflict (key) do nothing
  returning * into v_result;

  if v_result.key is null then
    raise exception 'هذا النوع موجود أصلاً' using errcode = '23505';
  end if;

  return v_result;
end;
$$;