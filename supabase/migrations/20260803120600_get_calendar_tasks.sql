-- migration: 20260803120600_get_calendar_tasks.sql
-- المكان: supabase/migrations/20260803120600_get_calendar_tasks.sql
-- شغّلها بـ: supabase db push (تأكد إنها آخر مايجريشن بالترتيب عندك قبل)

create or replace function public.get_calendar_tasks(
  p_member_ids uuid[],
  p_start date,
  p_end date
)
returns table (
  id         uuid,
  member_id  uuid,
  title      text,
  start_date date,
  end_date   date,
  status     text
)
language sql
stable
as $$
  select
    t.id,
    t.assigned_to as member_id,
    t.title,
    t.start_date,
    t.end_date,
    t.status::text
  from public.tasks t
  where t.assigned_to = any(p_member_ids)
    and t.start_date <= p_end
    and t.end_date   >= p_start
  order by t.assigned_to, t.start_date;
$$;

grant execute on function public.get_calendar_tasks(uuid[], date, date) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- تجربة بالـ SQL Editor بعد التشغيل:
--
--   select * from get_calendar_tasks(
--     array['9ed8defe-f771-4ec2-abb7-5705d3b92fcb']::uuid[],
--     '2026-07-01', '2026-09-30'
--   );
--
-- لازم يرجعلك التاسك "تجربة" (يلي عندك) لأنه start/end بتتقاطع
-- مع النطاق يوليو-سبتمبر.
-- ─────────────────────────────────────────────────────────────