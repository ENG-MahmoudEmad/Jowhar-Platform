-- supabase/migrations/20260808170000_auto_rename_on_copy.sql
-- ============================================================
-- تعديل copy_items وcopy_files: لو بالوجهة عنصر/ملف بنفس الاسم (name_en)،
-- الجديد ياخد رقم تلقائي (name1, name2...) بدل ما يتكرر بنفس الاسم
-- بالضبط. القرار المطلوب: بدون مسافة أو أقواس، رقم ملاصق للاسم مباشرة.
-- ============================================================

create or replace function public.copy_items(p_item_ids uuid[], p_to_section_id uuid)
returns setof public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src_platform uuid;
  v_dst_platform uuid;
  v_item record;
  v_base_name_en text;
  v_base_name_ar text;
  v_final_name_en text;
  v_final_name_ar text;
  v_suffix int;
  v_new_id uuid;
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

  for v_item in
    select * from public.items where id = any(p_item_ids)
  loop
    v_base_name_en := v_item.name_en;
    v_base_name_ar := v_item.name_ar;
    v_final_name_en := v_base_name_en;
    v_final_name_ar := v_base_name_ar;
    v_suffix := 1;

    while exists (
      select 1 from public.items
      where section_id = p_to_section_id and name_en = v_final_name_en
    ) loop
      v_final_name_en := v_base_name_en || v_suffix::text;
      v_final_name_ar := v_base_name_ar || v_suffix::text;
      v_suffix := v_suffix + 1;
    end loop;

    insert into public.items (
      section_id, name_en, name_ar, description_en, description_ar,
      drive_url, thumbnail_url, tag, created_by
    ) values (
      p_to_section_id, v_final_name_en, v_final_name_ar,
      v_item.description_en, v_item.description_ar,
      v_item.drive_url, v_item.thumbnail_url, v_item.tag, auth.uid()
    )
    returning id into v_new_id;

    return query select * from public.items where id = v_new_id;
  end loop;
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
  v_file record;
  v_base_name_en text;
  v_base_name_ar text;
  v_final_name_en text;
  v_final_name_ar text;
  v_suffix int;
  v_new_id uuid;
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

  for v_file in
    select * from public.files where id = any(p_file_ids)
  loop
    v_base_name_en := v_file.name_en;
    v_base_name_ar := v_file.name_ar;
    v_final_name_en := v_base_name_en;
    v_final_name_ar := v_base_name_ar;
    v_suffix := 1;

    while exists (
      select 1 from public.files
      where item_id = p_to_item_id and name_en = v_final_name_en
    ) loop
      v_final_name_en := v_base_name_en || v_suffix::text;
      v_final_name_ar := v_base_name_ar || v_suffix::text;
      v_suffix := v_suffix + 1;
    end loop;

    insert into public.files (
      item_id, name_en, name_ar, drive_url, file_type, created_by
    ) values (
      p_to_item_id, v_final_name_en, v_final_name_ar,
      v_file.drive_url, v_file.file_type, auth.uid()
    )
    returning id into v_new_id;

    return query select * from public.files where id = v_new_id;
  end loop;
end;
$$;