-- =====================================================================
-- Migration: تحكم بمقاس وموضع صورة الخبر
--
-- image_aspect: نسبة العرض للطول المعروضة (المستخدم يختار وقت النشر).
-- image_position_x / image_position_y: نسبة مئوية (0-100) تحدد أي جزء
-- من الصورة يظهر جوا الإطار المقصوص — نفس فكرة CSS object-position،
-- بس محفوظة بالداتابيز عشان تصير قابلة للتعديل لاحقًا (سحب وإفلات
-- بالـComposer).
-- =====================================================================

alter table public.news_posts
  add column if not exists image_aspect text not null default 'landscape'
    check (image_aspect in ('landscape', 'portrait', 'square')),
  add column if not exists image_position_x smallint not null default 50
    check (image_position_x between 0 and 100),
  add column if not exists image_position_y smallint not null default 50
    check (image_position_y between 0 and 100);