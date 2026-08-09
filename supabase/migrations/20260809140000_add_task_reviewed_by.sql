-- supabase/migrations/20260809140000_add_task_reviewed_by.sql
--
-- مين وافق/رفض فعليًا — ممكن يكون شخص مختلف عن created_by (مثلاً: أدمن
-- عادي فتح التاسك، بس الشيف أدمن هو اللي راجعها ووافق/رفض). بدون هالعمود
-- ما في طريقة نعرف مين اتخذ قرار المراجعة تحديدًا.

alter table public.tasks
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

comment on column public.tasks.reviewed_by is
  'مين وافق/رفض فعليًا (آخر قرار مراجعة) — ينفصل عن created_by لأن المراجع ممكن يكون شخص تاني';