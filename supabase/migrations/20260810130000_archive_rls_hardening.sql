-- ══════════════════════════════════════════════════════════════════
-- تشديد RLS على works/sections/items/files: INSERT/UPDATE بس
-- (SELECT يضل true عن قصد — نفس تصميم platforms، التصفح مفتوح
--  والقفل عرضي بالواجهة فقط). DELETE بدون policy = ممنوع افتراضيًا،
--  والحذف الفعلي عبر RPCs الموجودة أصلًا (SECURITY DEFINER).
-- ══════════════════════════════════════════════════════════════════

-- Works: platform_id موجود مباشرة بالصف
drop policy if exists "works_insert" on public.works;
create policy "works_insert" on public.works
for insert
with check ( public.can_manage_archive(auth.uid(), platform_id) );

drop policy if exists "works_update" on public.works;
create policy "works_update" on public.works
for update
using      ( public.can_manage_archive(auth.uid(), platform_id) )
with check ( public.can_manage_archive(auth.uid(), platform_id) );

-- Sections: platform_id عبر work_id
drop policy if exists "sections_insert" on public.sections;
create policy "sections_insert" on public.sections
for insert
with check (
  exists (
    select 1 from public.works w
    where w.id = work_id
      and public.can_manage_archive(auth.uid(), w.platform_id)
  )
);

drop policy if exists "sections_update" on public.sections;
create policy "sections_update" on public.sections
for update
using (
  exists (
    select 1 from public.works w
    where w.id = work_id
      and public.can_manage_archive(auth.uid(), w.platform_id)
  )
)
with check (
  exists (
    select 1 from public.works w
    where w.id = work_id
      and public.can_manage_archive(auth.uid(), w.platform_id)
  )
);

-- Items: platform_id عبر section_id → work_id
drop policy if exists "items_insert" on public.items;
create policy "items_insert" on public.items
for insert
with check (
  exists (
    select 1 from public.sections s
    join public.works w on w.id = s.work_id
    where s.id = section_id
      and public.can_manage_archive(auth.uid(), w.platform_id)
  )
);

drop policy if exists "items_update" on public.items;
create policy "items_update" on public.items
for update
using (
  exists (
    select 1 from public.sections s
    join public.works w on w.id = s.work_id
    where s.id = section_id
      and public.can_manage_archive(auth.uid(), w.platform_id)
  )
)
with check (
  exists (
    select 1 from public.sections s
    join public.works w on w.id = s.work_id
    where s.id = section_id
      and public.can_manage_archive(auth.uid(), w.platform_id)
  )
);

-- Files: platform_id عبر item_id → section_id → work_id
drop policy if exists "files_insert" on public.files;
create policy "files_insert" on public.files
for insert
with check (
  exists (
    select 1 from public.items i
    join public.sections s on s.id = i.section_id
    join public.works w    on w.id = s.work_id
    where i.id = item_id
      and public.can_manage_archive(auth.uid(), w.platform_id)
  )
);

drop policy if exists "files_update" on public.files;
create policy "files_update" on public.files
for update
using (
  exists (
    select 1 from public.items i
    join public.sections s on s.id = i.section_id
    join public.works w    on w.id = s.work_id
    where i.id = item_id
      and public.can_manage_archive(auth.uid(), w.platform_id)
  )
)
with check (
  exists (
    select 1 from public.items i
    join public.sections s on s.id = i.section_id
    join public.works w    on w.id = s.work_id
    where i.id = item_id
      and public.can_manage_archive(auth.uid(), w.platform_id)
  )
);