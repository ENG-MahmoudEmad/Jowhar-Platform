-- =====================================================================
-- Migration: index لدالة notify_due_news_posts
--
-- الدالة نفسها مبنية صح (ما بتعمل أي UPDATE لو مافي صفوف مستحقة —
-- راجع migration الإشعارات). المتبقي بس تسريع الـSELECT نفسه مع نمو
-- جدول news_posts بمرور الوقت.
--
-- Partial index (WHERE notified_at IS NULL) بدل index عادي على العمود
-- كامل: الصفوف يلي notified_at فيها مليان (الأغلبية الساحقة مع الوقت)
-- ما إلها داعي تكون بالـindex أصلاً — الاستعلام دايمًا بيفلتر عليها.
-- هيك الـindex نفسه أصغر وأسرع، وبينمو بس مع الأخبار المجدولة يلي
-- لسا ما انبعت إشعارها (عدد صغير دايمًا بالتصميم).
-- =====================================================================

create index if not exists idx_news_posts_pending_notify
  on public.news_posts (publish_at)
  where notified_at is null;