-- Migration: get_all_work_stats
-- الهدف: استبدال استدعاء get_work_stats مرة لكل work (N+1 queries) باستعلام
-- واحد مجمّع يرجّع إحصائيات كل الـ works تبع منصة معيّنة دفعة وحدة.
-- نفس فلسفة get_all_platform_stats الموجودة أصلاً — استعلام واحد بدل حلقة.
--
-- الاستخدام بالفرونت إند (بدل Promise.all اللي كان يستدعي get_work_stats
-- لكل work لحاله بـ [platformId]/page.tsx):
--
--   const { data: workStatsData } = await supabase.rpc('get_all_work_stats', {
--     p_platform_id: platformData.id,
--   });
--   const workStatsMap = new Map(
--     (workStatsData ?? []).map(row => [row.work_id, row])
--   );

CREATE OR REPLACE FUNCTION get_all_work_stats(p_platform_id uuid)
RETURNS TABLE (
  work_id       uuid,
  sections_count bigint,
  files_count    bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    w.id                          AS work_id,
    COUNT(DISTINCT s.id)          AS sections_count,
    COUNT(DISTINCT f.id)          AS files_count
  FROM works w
  LEFT JOIN sections s ON s.work_id = w.id
  LEFT JOIN items i    ON i.section_id = s.id
  LEFT JOIN files f    ON f.item_id = i.id
  WHERE w.platform_id = p_platform_id
  GROUP BY w.id;
$$;

-- بدون SECURITY DEFINER عن قصد: نفس صلاحيات القراءة العادية على
-- works/sections/items/files (RLS الموجودة أصلاً كافية لهاد الاستعلام،
-- زي get_work_stats القديمة تمامًا — ما في داعي لتخطي RLS هون).

GRANT EXECUTE ON FUNCTION get_all_work_stats(uuid) TO authenticated;

COMMENT ON FUNCTION get_all_work_stats(uuid) IS
  'Batched replacement for calling get_work_stats once per work (N+1). '
  'Returns sections_count and files_count for every work under a platform '
  'in a single query.';