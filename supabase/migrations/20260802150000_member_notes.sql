-- =====================================================================
-- Migration 009: member_notes — الملاحظات الشخصية للعضو
--
-- ⚠️ خاصة تمامًا: صاحبها فقط يقرأها ويكتبها.
-- لا الأدمن، ولا الـ Chief، ولا الـ Developer — ولا حتى عبر Admin Control.
-- ما في أي سياسة هون بتستدعي can_manage_member، وهذا مقصود:
-- دفتر ملاحظات شخصي بيقرأه المدير مش دفتر ملاحظات شخصي.
--
-- (الوصول الوحيد الممكن هو service_role، وهو محجوز للعمليات الإدارية
--  وما بيُستورد أبدًا بكود بيوصل المتصفح.)
-- =====================================================================

create table public.member_notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  title      text not null check (char_length(btrim(title)) between 1 and 120),
  content    text not null default '' check (char_length(content) <= 10000),
  -- hex بيختاره العضو من لوحة ثابتة بالواجهة
  color      text not null default '#458482'
             check (color ~* '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- القائمة دايمًا مرتبة بآخر تعديل
create index member_notes_owner_idx on public.member_notes (owner_id, updated_at desc);

create trigger trg_member_notes_updated_at
  before update on public.member_notes
  for each row execute function public.set_row_updated_at();

-- ---------------------------------------------------------------------
-- RLS — أربع سياسات، كلها نفس الشرط: أنت صاحبها
-- ---------------------------------------------------------------------

alter table public.member_notes enable row level security;

create policy member_notes_select on public.member_notes
  for select to authenticated
  using (owner_id = auth.uid());

create policy member_notes_insert on public.member_notes
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy member_notes_update on public.member_notes
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy member_notes_delete on public.member_notes
  for delete to authenticated
  using (owner_id = auth.uid());

-- GRANTs (درس #1: db push ما بيعطيها تلقائيًا)
grant select, insert, update, delete on public.member_notes to authenticated;