-- migration: 20260803120800_note_replies_author_role_default.sql
-- المكان: supabase/migrations/20260803120800_note_replies_author_role_default.sql
-- شغّلها بـ: supabase db push (تأكد إنها آخر مايجريشن بالترتيب عندك قبل)

-- author_role إلزامي (NOT NULL) بدون DEFAULT، وقيمته الحقيقية دايمًا
-- بتنحسب بـ trigger موجود أصلًا (author_id = member_id ⇒ member، غير هيك
-- director) — الكود بـ notesActions.ts متعمّد ما يبعتها.
--
-- المشكلة: بدون DEFAULT، Supabase بيولّد نوع TypeScript يعتبر العمود
-- "إلزامي" وقت الـ insert من ناحية الكود، رغم إنه الـ trigger بيتكفّل فيه
-- دايمًا ويتجاهل أي قيمة تجي من العميل. إضافة DEFAULT بسيط هون بتخلّي
-- TypeScript يعتبره اختياري (يطابق الواقع)، والـ trigger بيضل يعيد حسابه
-- ويتجاوز الـ DEFAULT بكل الأحوال — مافي تأثير فعلي على البيانات.

alter table public.note_replies
  alter column author_role set default 'member';

-- ─────────────────────────────────────────────────────────────
-- تجربة بالـ SQL Editor بعد التشغيل:
--
--   select column_name, column_default
--   from information_schema.columns
--   where table_name = 'note_replies' and column_name = 'author_role';
--
-- لازم يرجّع column_default = 'member'::text (أو شكل مشابه).
--
-- ⚠️ تأكيد إضافي: افتح الـ trigger function المسؤولة عن حساب author_role
-- (دوّر عليها بالـ SQL Editor: select proname from pg_proc where prosrc
-- ilike '%author_role%';) وتأكد إنها بتعيد حساب القيمة unconditionally
-- (مش بس لو كانت NULL) — لو هيك، الـ DEFAULT الجديد آمن 100%.
-- ─────────────────────────────────────────────────────────────