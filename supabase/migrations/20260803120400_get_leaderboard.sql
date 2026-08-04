-- migration: 20260803120400_get_leaderboard.sql
-- المكان: supabase/migrations/20260803120400_get_leaderboard.sql
-- شغّلها بـ: supabase db push (تأكد إنها آخر مايجريشن بالترتيب عندك قبل)

-- معادلة النقاط (متفق عليها بالمحادثة):
--   اكتمل متأخر (بعد الموعد النهائي)                              → 1 نقطة
--   اكتمل بالوقت العادي (قبل الموعد، بس مش بآخر 10% من المدة)      → 3 نقاط
--   اكتمل مبكرًا (قبل ما توصل آخر 10% من المدة الكلية للتاسك)      → 5 نقاط (3 + بونص 2)
--
-- حدود الفترة بتوقيت الاستوديو (Asia/Riyadh):
--   weekly  → من الأحد الحالي، نفس بداية أسبوع ProjectCalendar بالضبط
--   monthly → الشهر الميلادي الحالي، نفس عدّاد DONE بـ My Tasks

create or replace function public.get_leaderboard(p_period text default 'weekly')
returns table (
  rank            int,
  id              uuid,
  name            text,
  initials        text,
  color           text,
  score           bigint,
  tasks_completed bigint
)
language plpgsql
stable
as $$
declare
  v_today        date := (now() at time zone 'Asia/Riyadh')::date;
  v_period_start date;
  v_period_end   date; -- exclusive
begin
  if p_period = 'monthly' then
    v_period_start := date_trunc('month', v_today)::date;
    v_period_end   := (v_period_start + interval '1 month')::date;
  else
    -- weekly: يبدأ الأحد — نفس extract(dow) اللي بيستخدمها ProjectCalendar
    -- (getDay() == 0 يعني الأحد بجافاسكريبت، ونفس المنطق هون بالـ SQL)
    v_period_start := v_today - extract(dow from v_today)::int;
    v_period_end   := v_period_start + 7;
  end if;

  return query
  with scored as (
    select
      t.assigned_to,
      case
        when t.completed_at > d.deadline_at then 1
        when t.completed_at < (d.deadline_at - (d.window_seconds * 0.1) * interval '1 second') then 5
        else 3
      end as task_score
    from public.tasks t
    cross join lateral (
      select
        (t.end_date::timestamp + interval '1 day' - interval '1 second')
          at time zone 'Asia/Riyadh' as deadline_at,
        extract(epoch from (
          (t.end_date::timestamp + interval '1 day' - interval '1 second') at time zone 'Asia/Riyadh'
          - (t.start_date::timestamp) at time zone 'Asia/Riyadh'
        )) as window_seconds
    ) d
    where t.status = 'done'
      and t.assigned_to is not null
      and t.completed_at >= (v_period_start::timestamp at time zone 'Asia/Riyadh')
      and t.completed_at <  (v_period_end::timestamp   at time zone 'Asia/Riyadh')
  ),
  aggregated as (
    select
      s.assigned_to,
      sum(s.task_score)  as score,
      count(*)            as tasks_completed
    from scored s
    group by s.assigned_to
  )
  select
    row_number() over (order by a.score desc, a.tasks_completed desc)::int as rank,
    p.id,
    trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as name,
    upper(
      left(coalesce(p.first_name, ''), 1) || left(coalesce(p.last_name, ''), 1)
    ) as initials,
    p.color,
    a.score,
    a.tasks_completed
  from aggregated a
  join public.profiles p on p.id = a.assigned_to
  where p.status = 'active'
    and p.deleted_at is null
  order by a.score desc, a.tasks_completed desc
  limit 3;
end;
$$;

grant execute on function public.get_leaderboard(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- تجربة بالـ SQL Editor بعد التشغيل:
--
--   select * from get_leaderboard('weekly');
--   select * from get_leaderboard('monthly');
--
-- بما إنه ما في تاسكات done بالوقت الحالي عندك، الدالة رح ترجع
-- صفوف فاضية (0 صفوف) — هاد طبيعي، مش خطأ. لازم تختبرها بعد ما
-- تبدّل يدويًا حالة تاسك أو اتنين لـ done من SQL Editor:
--
--   update tasks
--   set status = 'done', completed_at = now()
--   where id = '<uuid تاسك تبعك هون>';
--
-- بعدها جرّب get_leaderboard('weekly') من جديد وشوف إنه ظهر
-- بصف واحد بنقاط منطقية (1 أو 3 أو 5 حسب توقيت completed_at
-- مقارنة بالموعد النهائي).
-- ─────────────────────────────────────────────────────────────