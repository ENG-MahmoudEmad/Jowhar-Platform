-- supabase/migrations/20260808190100_add_task_submission_columns.sql
--
-- أعمدة نظام تسليم/مراجعة التاسك (بدل نظام الإثبات القديم الموثّق بالجزء 07 —
-- هذا تصميم جديد كامل: نص تسليم اختياري بدل إثبات مرفوع، لأن رابط الشغل
-- (درايف مثلاً) بيترسل خارج النظام مسبقًا بين الأدمن والعضو).

alter table public.tasks
  add column if not exists submitted_note text,
  add column if not exists submitted_at timestamptz,
  add column if not exists last_rejection_note text,
  add column if not exists rejection_seen_at timestamptz;

-- نص التسليم اختياري (حسب القرار)، بس لو موجود محدود بـ500 حرف
alter table public.tasks
  add constraint tasks_submitted_note_length
  check (submitted_note is null or char_length(submitted_note) <= 500);

comment on column public.tasks.submitted_note is
  'نص اختياري يكتبه العضو وقت التسليم (أين رفع الشغل) — تذكيري، ≤500 حرف';
comment on column public.tasks.submitted_at is
  'وقت آخر تسليم (open→pending_review) — هذا هو الوقت المعتمد لحساب completed_at لاحقًا، مش وقت موافقة الأدمن';
comment on column public.tasks.last_rejection_note is
  'آخر سبب رفض من الأدمن — يتبدل مع كل رفض جديد لنفس التاسك، مش سجل تاريخي';
comment on column public.tasks.rejection_seen_at is
  'وقت ما العضو فتح/شاف سبب الرفض — يترجع NULL تلقائيًا مع أي رفض جديد';