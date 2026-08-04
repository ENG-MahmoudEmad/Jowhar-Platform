-- migration: 20260803120300_get_my_deadlines.sql
-- المكان: supabase/migrations/20260803120300_get_my_deadlines.sql
-- شغّلها بـ: supabase db push (تأكد إنها آخر مايجريشن بالترتيب عندك قبل)

-- الموعد النهائي = نهاية يوم end_date (23:59:59) بتوقيت الاستوديو (مكة).
-- ما في عمود ساعة منفصل بجدول tasks، فهاد أدق شي ممكن نعمله من غير
-- تغيير بالسكيما (قرار محسوم — راجع المحادثة).

create or replace function public.get_my_deadlines()
returns table (
  id             uuid,
  title          text,
  priority       text,
  start_at       timestamptz,
  deadline_at    timestamptz,
  window_seconds integer
)
language sql
stable
security invoker
as $$
  select
    t.id,
    t.title,
    t.priority::text,
    (t.start_date::timestamp) at time zone 'Asia/Riyadh' as start_at,
    (t.end_date::timestamp + interval '1 day' - interval '1 second')
      at time zone 'Asia/Riyadh' as deadline_at,
    extract(
      epoch from (
        (t.end_date::timestamp + interval '1 day' - interval '1 second')
          at time zone 'Asia/Riyadh'
        - (t.start_date::timestamp) at time zone 'Asia/Riyadh'
      )
    )::integer as window_seconds
  from public.tasks t
  where t.assigned_to = auth.uid()
    and t.status = 'open'
  order by t.end_date asc, t.id asc;
$$;

grant execute on function public.get_my_deadlines() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- تجربة بالـ SQL Editor بعد التشغيل:
--
--   select * from get_my_deadlines();
--
-- بما إنها بتعتمد على auth.uid()، لازم تشغّلها وانت "مسجّل دخول"
-- بسياق المستخدم (SQL Editor بـ Supabase بيشتغل كـ service role
-- افتراضيًا، فـ auth.uid() ممكن يطلع NULL ومايرجعلك صفوف).
--
-- الطريقة الصح للتجربة: استبدل auth.uid() مؤقتًا بالـ uuid تبعك
-- عشان تتأكد المنطق نفسه صحيح:
--
--   select
--     id, title, priority, start_at, deadline_at, window_seconds
--   from tasks t, lateral (
--     select
--       (t.start_date::timestamp) at time zone 'Asia/Riyadh' as start_at,
--       (t.end_date::timestamp + interval '1 day' - interval '1 second')
--         at time zone 'Asia/Riyadh' as deadline_at
--   ) x
--   where t.assigned_to = '<uuid تبعك هون>'
--     and t.status = 'open'
--   order by t.end_date asc;
--
-- تأكد إنه deadline_at طالع فعلاً الساعة 23:59:59 بتوقيت مكة لليوم
-- الصحيح، والـ window_seconds رقم موجب معقول (مش سالب ولا صفر).
-- ─────────────────────────────────────────────────────────────