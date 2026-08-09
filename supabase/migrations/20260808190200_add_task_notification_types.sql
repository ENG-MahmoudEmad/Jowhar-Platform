-- supabase/migrations/20260808190200_add_task_notification_types.sql
--
-- إضافة أنواع إشعارات جديدة لدورة تسليم/مراجعة التاسك.
-- ⚠️ القيم بس هون — منطق الـ trigger الفعلي (مين بيستلم، رسالة الإشعار...)
-- مؤجل بقصد لجلسة منفصلة (موضوع الإشعارات كامل بالموقع يحتاج تدقيق أشمل).

alter type notification_type add value if not exists 'task_submitted';
alter type notification_type add value if not exists 'task_approved';
alter type notification_type add value if not exists 'task_rejected';