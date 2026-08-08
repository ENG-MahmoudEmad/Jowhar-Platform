-- ============================================================
-- 08: get_platform_stats — تجميع كامل (القرار المحسوم)
-- folders = مجموع كل الـ Sections عبر كل الـ Works بالمنصة
-- files   = مجموع كل الـ Files الفعلية عبر كل شي تحتها
-- ============================================================

create or replace function public.get_platform_stats(p_platform_id uuid)
returns table (folders_count bigint, files_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*) from public.sections s
       join public.works w on w.id = s.work_id
       where w.platform_id = p_platform_id) as folders_count,
    (select count(*) from public.files f
       join public.items i on i.id = f.item_id
       join public.sections s on s.id = i.section_id
       join public.works w on w.id = s.work_id
       where w.platform_id = p_platform_id) as files_count;
$$;

-- نسخة لكل المنصات دفعة وحدة (لتفادي N+1 استدعاء بصفحة Platforms الرئيسية)
create or replace function public.get_all_platform_stats()
returns table (platform_id uuid, folders_count bigint, files_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    w.platform_id,
    count(distinct s.id) as folders_count,
    count(f.id) as files_count
  from public.works w
  left join public.sections s on s.work_id = w.id
  left join public.items i on i.section_id = s.id
  left join public.files f on f.item_id = i.id
  group by w.platform_id;
$$;

-- ونفس الفكرة على مستوى Work (لصفحة Sections/Header)
create or replace function public.get_work_stats(p_work_id uuid)
returns table (sections_count bigint, files_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*) from public.sections s where s.work_id = p_work_id) as sections_count,
    (select count(*) from public.files f
       join public.items i on i.id = f.item_id
       join public.sections s on s.id = i.section_id
       where s.work_id = p_work_id) as files_count;
$$;