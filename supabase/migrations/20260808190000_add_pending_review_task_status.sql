-- supabase/migrations/20260808190000_add_pending_review_task_status.sql
--
-- إضافة حالة وسيطة جديدة لدورة حياة التاسك: pending_review
-- (بين open و done — العضو بيسلّم، الأدمن بيوافق أو يرفض)
--
-- ⚠️ ALTER TYPE ... ADD VALUE لازم يكون بترانزاكشن لحاله، ما بينفع يتحط
-- بنفس الميغريشن مع أي كود تاني بيستخدم القيمة الجديدة فورًا.

alter type task_status add value if not exists 'pending_review';