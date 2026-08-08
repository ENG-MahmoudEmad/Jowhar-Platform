-- ============================================================
-- 10: نظام النسخ/النقل الكامل — صلاحية منفصلة archive.copy_move (القرار المحسوم)
-- كل دالة بتتحقق من الصلاحية على المصدر والوجهة معًا قبل التنفيذ
-- ============================================================

-- ---------- Items ----------

create or replace function public.move_items(p_item_ids uuid[], p_to_section_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src_platform uuid;
  v_dst_platform uuid;
begin
  select w.platform_id into v_dst_platform
  from public.sections s join public.works w on w.id = s.work_id
  where s.id = p_to_section_id;

  select w.platform_id into v_src_platform
  from public.items i
  join public.sections s on s.id = i.section_id
  join public.works w on w.id = s.work_id
  where i.id = p_item_ids[1];

  if not (public.can_copy_move_archive(auth.uid(), v_src_platform)
          and public.can_copy_move_archive(auth.uid(), v_dst_platform)) then
    raise exception 'ليس لديك صلاحية النسخ/النقل على المصدر أو الوجهة';
  end if;

  update public.items set section_id = p_to_section_id
  where id = any(p_item_ids);
end;
$$;

create or replace function public.copy_items(p_item_ids uuid[], p_to_section_id uuid)
returns setof public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src_platform uuid;
  v_dst_platform uuid;
begin
  select w.platform_id into v_dst_platform
  from public.sections s join public.works w on w.id = s.work_id
  where s.id = p_to_section_id;

  select w.platform_id into v_src_platform
  from public.items i
  join public.sections s on s.id = i.section_id
  join public.works w on w.id = s.work_id
  where i.id = p_item_ids[1];

  if not (public.can_copy_move_archive(auth.uid(), v_src_platform)
          and public.can_copy_move_archive(auth.uid(), v_dst_platform)) then
    raise exception 'ليس لديك صلاحية النسخ/النقل على المصدر أو الوجهة';
  end if;

  return query
    insert into public.items (section_id, name_en, name_ar, drive_url, created_by)
    select p_to_section_id, name_en, name_ar, drive_url, auth.uid()
    from public.items
    where id = any(p_item_ids)
    returning *;
end;
$$;

-- ---------- Sections كاملة (مع قاعدة الدمج) ----------

create or replace function public.move_section(p_section_id uuid, p_to_work_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src_platform uuid;
  v_dst_platform uuid;
  v_existing_section_id uuid;
  v_section_name_en text;
begin
  select w.platform_id, s.name_en into v_src_platform, v_section_name_en
  from public.sections s join public.works w on w.id = s.work_id
  where s.id = p_section_id;

  select platform_id into v_dst_platform from public.works where id = p_to_work_id;

  if not (public.can_copy_move_archive(auth.uid(), v_src_platform)
          and public.can_copy_move_archive(auth.uid(), v_dst_platform)) then
    raise exception 'ليس لديك صلاحية النسخ/النقل على المصدر أو الوجهة';
  end if;

  -- قاعدة الدمج: لو فيه سكشن بنفس الاسم بالوجهة
  select id into v_existing_section_id
  from public.sections
  where work_id = p_to_work_id and name_en = v_section_name_en
  limit 1;

  if v_existing_section_id is not null then
    -- دمج: العناصر تنضم للسكشن الموجود، والسكشن المصدر (الفاضي) ينحذف
    update public.items set section_id = v_existing_section_id
    where section_id = p_section_id;

    delete from public.sections where id = p_section_id;
  else
    -- reparent بسيط
    update public.sections set work_id = p_to_work_id where id = p_section_id;
  end if;
end;
$$;

create or replace function public.copy_section(p_section_id uuid, p_to_work_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src_platform uuid;
  v_dst_platform uuid;
  v_existing_section_id uuid;
  v_new_section_id uuid;
  v_section public.sections%rowtype;
begin
  select s.* into v_section
  from public.sections s
  where s.id = p_section_id;

  select w.platform_id into v_src_platform
  from public.works w
  where w.id = v_section.work_id;

  select platform_id into v_dst_platform from public.works where id = p_to_work_id;

  if not (public.can_copy_move_archive(auth.uid(), v_src_platform)
          and public.can_copy_move_archive(auth.uid(), v_dst_platform)) then
    raise exception 'ليس لديك صلاحية النسخ/النقل على المصدر أو الوجهة';
  end if;

  select id into v_existing_section_id
  from public.sections
  where work_id = p_to_work_id and name_en = v_section.name_en
  limit 1;

  if v_existing_section_id is not null then
    -- دمج: بس بننسخ العناصر (id جديد) بدل ما ننقلها، السكشن المصدر يضل زي ما هو
    insert into public.items (section_id, name_en, name_ar, drive_url, created_by)
    select v_existing_section_id, name_en, name_ar, drive_url, auth.uid()
    from public.items where section_id = p_section_id;
  else
    insert into public.sections (work_id, name_en, name_ar, description_en, description_ar, icon, created_by)
    values (p_to_work_id, v_section.name_en, v_section.name_ar, v_section.description_en, v_section.description_ar, v_section.icon, auth.uid())
    returning id into v_new_section_id;

    insert into public.items (section_id, name_en, name_ar, drive_url, created_by)
    select v_new_section_id, name_en, name_ar, drive_url, auth.uid()
    from public.items where section_id = p_section_id;
  end if;
end;
$$;

-- ---------- Files ----------

create or replace function public.move_files(p_file_ids uuid[], p_to_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src_platform uuid;
  v_dst_platform uuid;
begin
  select w.platform_id into v_dst_platform
  from public.items i
  join public.sections s on s.id = i.section_id
  join public.works w on w.id = s.work_id
  where i.id = p_to_item_id;

  select w.platform_id into v_src_platform
  from public.files f
  join public.items i on i.id = f.item_id
  join public.sections s on s.id = i.section_id
  join public.works w on w.id = s.work_id
  where f.id = p_file_ids[1];

  if not (public.can_copy_move_archive(auth.uid(), v_src_platform)
          and public.can_copy_move_archive(auth.uid(), v_dst_platform)) then
    raise exception 'ليس لديك صلاحية النسخ/النقل على المصدر أو الوجهة';
  end if;

  update public.files set item_id = p_to_item_id where id = any(p_file_ids);
end;
$$;

create or replace function public.copy_files(p_file_ids uuid[], p_to_item_id uuid)
returns setof public.files
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src_platform uuid;
  v_dst_platform uuid;
begin
  select w.platform_id into v_dst_platform
  from public.items i
  join public.sections s on s.id = i.section_id
  join public.works w on w.id = s.work_id
  where i.id = p_to_item_id;

  select w.platform_id into v_src_platform
  from public.files f
  join public.items i on i.id = f.item_id
  join public.sections s on s.id = i.section_id
  join public.works w on w.id = s.work_id
  where f.id = p_file_ids[1];

  if not (public.can_copy_move_archive(auth.uid(), v_src_platform)
          and public.can_copy_move_archive(auth.uid(), v_dst_platform)) then
    raise exception 'ليس لديك صلاحية النسخ/النقل على المصدر أو الوجهة';
  end if;

  return query
    insert into public.files (item_id, name_en, name_ar, drive_url, file_type, created_by)
    select p_to_item_id, name_en, name_ar, drive_url, file_type, auth.uid()
    from public.files
    where id = any(p_file_ids)
    returning *;
end;
$$;