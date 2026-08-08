-- ============================================================
-- 11: دوال حذف موحّدة لكل المستويات الخمسة — محصورة بـ can_delete_archive()
-- (Chief Admin / Developer فقط، بند 2-ج بالتوثيق — غير قابلة للمنح إطلاقًا)
-- ============================================================

create or replace function public.delete_platform(p_platform_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_delete_archive(auth.uid()) then
    raise exception 'الحذف محصور بـ Chief Admin / Developer فقط';
  end if;
  delete from public.platforms where id = p_platform_id;
end;
$$;

create or replace function public.delete_work(p_work_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_delete_archive(auth.uid()) then
    raise exception 'الحذف محصور بـ Chief Admin / Developer فقط';
  end if;
  delete from public.works where id = p_work_id;
end;
$$;

create or replace function public.delete_section(p_section_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_delete_archive(auth.uid()) then
    raise exception 'الحذف محصور بـ Chief Admin / Developer فقط';
  end if;
  delete from public.sections where id = p_section_id;
end;
$$;

create or replace function public.delete_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_delete_archive(auth.uid()) then
    raise exception 'الحذف محصور بـ Chief Admin / Developer فقط';
  end if;
  delete from public.items where id = p_item_id;
end;
$$;

create or replace function public.delete_file(p_file_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_delete_archive(auth.uid()) then
    raise exception 'الحذف محصور بـ Chief Admin / Developer فقط';
  end if;
  delete from public.files where id = p_file_id;
end;
$$;

-- كل الحذف Hard delete فوري (زي ما هو مقرر بالفرونت إند) — الـ cascade
-- على الـ foreign keys (work_id, section_id, item_id) بيتكفل بالمستويات التحتية تلقائيًا