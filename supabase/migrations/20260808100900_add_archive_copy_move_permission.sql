-- ============================================================
-- 09: إضافة مفتاح صلاحية جديد لسجل الصلاحيات المركزي
-- ✅ مؤكد من السكيما الفعلية: الجدول اسمه public.permissions
-- بأعمدة (key, label_en, label_ar, category, sort_order)
-- ============================================================

insert into public.permissions (key, label_en, label_ar, category, sort_order)
values (
  'archive.copy_move',
  'Copy/Move Archive Items',
  'نسخ/نقل عناصر الأرشيف',
  'archive',
  (select coalesce(max(sort_order), 0) + 1 from public.permissions)
)
on conflict (key) do nothing;

-- هاي صلاحية منفصلة تمامًا عن archive.manage (القرار المحسوم) —
-- عضو ممكن يضيف/يعدّل بس ما يقدر ينسخ/ينقل، أو العكس.