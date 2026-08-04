-- migration: 20260803121500_fix_nested_window.sql
-- المكان: supabase/migrations/20260803121500_fix_nested_window.sql
-- شغّلها بـ: supabase db push (تأكد إنها آخر مايجريشن بالترتيب عندك قبل)
--
-- خطأ "window function calls cannot be nested": كان عندي row_number()
-- جوا min() over(...) بنفس الخطوة — ممنوع بـ Postgres. الحل: نفصلهم
-- بخطوتين (CTE إضافية) بدل ما نحطهم مع بعض.

create or replace function public.get_leaderboard_history(p_period text default 'weekly')
returns table (
  member_id       uuid,
  name            text,
  initials        text,
  color           text,
  avatar_url      text,
  times_first     int,
  times_second    int,
  times_third     int,
  current_streak  int
)
language plpgsql
as $$
declare
  v_now          date := (now() at time zone 'Asia/Riyadh')::date;
  v_cursor       date;
  v_current_start date;
  v_period_end   date;
  v_step         interval;
  v_earliest     date;
begin
  select (min(completed_at) at time zone 'Asia/Riyadh')::date
  into v_earliest
  from public.tasks
  where status = 'done';

  if v_earliest is null then
    return;
  end if;

  if p_period = 'monthly' then
    v_step := interval '1 month';
    v_cursor := date_trunc('month', v_earliest)::date;
    v_current_start := date_trunc('month', v_now)::date;
  else
    v_step := interval '7 days';
    v_cursor := v_earliest - extract(dow from v_earliest)::int;
    v_current_start := v_now - extract(dow from v_now)::int;
  end if;

  create temporary table _period_ranks (
    period_start date,
    rnk          int,
    assigned_to  uuid
  ) on commit drop;

  while v_cursor < v_current_start loop
    v_period_end := (v_cursor + v_step)::date;

    insert into _period_ranks (period_start, rnk, assigned_to)
    select v_cursor, ranked.rnk, ranked.assigned_to
    from (
      select
        s.assigned_to,
        row_number() over (
          order by sum(s.task_score) desc, count(*) desc, max(s.completed_at) asc
        ) as rnk
      from (
        select
          t.assigned_to,
          t.completed_at,
          case
            when t.completed_at > d.deadline_at then 1
            when t.completed_at < (d.deadline_at - (d.window_seconds * 0.1) * interval '1 second') then 5
            else 3
          end as task_score
        from public.tasks t
        cross join lateral (
          select
            (t.end_date::timestamp + interval '1 day' - interval '1 second') at time zone 'Asia/Riyadh' as deadline_at,
            extract(epoch from (
              (t.end_date::timestamp + interval '1 day' - interval '1 second') at time zone 'Asia/Riyadh'
              - (t.start_date::timestamp) at time zone 'Asia/Riyadh'
            )) as window_seconds
        ) d
        where t.status = 'done'
          and t.assigned_to is not null
          and t.completed_at >= (v_cursor::timestamp at time zone 'Asia/Riyadh')
          and t.completed_at <  (v_period_end::timestamp at time zone 'Asia/Riyadh')
      ) s
      group by s.assigned_to
    ) ranked
    where ranked.rnk <= 3;

    v_cursor := v_period_end;
  end loop;

  return query
  with agg as (
    select
      pr.assigned_to,
      count(*) filter (where pr.rnk = 1) as times_first,
      count(*) filter (where pr.rnk = 2) as times_second,
      count(*) filter (where pr.rnk = 3) as times_third
    from _period_ranks pr
    group by pr.assigned_to
  ),
  -- خطوة 1: بس نحسب rn (ترتيب زمني، الأحدث أول) — بدون أي دالة نافذة تانية معها
  ranked_periods as (
    select
      pr.assigned_to,
      pr.rnk,
      row_number() over (partition by pr.assigned_to order by pr.period_start desc) as rn
    from _period_ranks pr
  ),
  -- خطوة 2: هلق نقدر نستخدم min() over() على rn المحسوبة أصلاً بخطوة سابقة
  breaks as (
    select
      assigned_to,
      rn,
      min(case when rnk <> 1 then rn end) over (partition by assigned_to) as first_break_rn
    from ranked_periods
  ),
  streaks as (
    select assigned_to, count(*) as current_streak
    from breaks
    where rn < coalesce(first_break_rn, 999999)
    group by assigned_to
  )
  select
    p.id,
    trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as name,
    upper(left(coalesce(p.first_name, ''), 1) || left(coalesce(p.last_name, ''), 1)) as initials,
    p.color,
    p.avatar_url,
    coalesce(a.times_first, 0)::int,
    coalesce(a.times_second, 0)::int,
    coalesce(a.times_third, 0)::int,
    coalesce(s.current_streak, 0)::int
  from agg a
  join public.profiles p on p.id = a.assigned_to
  left join streaks s on s.assigned_to = a.assigned_to
  where p.status = 'active' and p.deleted_at is null
  order by a.times_first desc, a.times_second desc, a.times_third desc;
end;
$$;

grant execute on function public.get_leaderboard_history(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- تجربة بالـ SQL Editor بعد التشغيل:
--
--   select * from get_leaderboard_history('weekly');
--   select * from get_leaderboard_history('monthly');
--   -- المفروض يشتغل بدون أي خطأ هالمرة
-- ─────────────────────────────────────────────────────────────