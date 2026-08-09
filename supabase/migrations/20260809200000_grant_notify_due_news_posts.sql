-- =====================================================================
-- Migration: صلاحية استدعاء notify_due_news_posts من الفرونت
--
-- الدالة SECURITY DEFINER بس هذا وحده مش كافي — لازم EXECUTE grant
-- صريح لـ authenticated، وإلا أي استدعاء من صفحة الأخبار (جلسة عضو
-- عادي، مش service role زي الـ cron route) بيترفض بصمت.
-- =====================================================================

grant execute on function public.notify_due_news_posts() to authenticated;