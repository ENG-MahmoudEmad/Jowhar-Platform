-- migration: 20260803120500_add_avatar_to_dashboard_rpcs.sql
-- المكان: supabase/migrations/20260803120500_add_avatar_to_dashboard_rpcs.sql
-- شغّلها بـ: supabase db push (تأكد إنها آخر مايجريشن بالترتيب عندك قبل)
--
-- إضافة avatar_url لكل من get_team_progress() و get_leaderboard() —
-- Postgres ما بيسمح بتغيير أعمدة RETURNS TABLE عبر CREATE OR REPLACE،
-- فلازم DROP الأول.

drop function if exists public.get_team_progress();

create or replace function public.get_team_progress()
returns table (
  id            uuid,
  name          text,
  initials      text,
  job_title_en  text,
  job_title_ar  text,
  color         text,
  avatar_url    text,
  progress      smallint,
  active_tasks  bigint
)
language sql
stable
as $$
  select
    p.id,
    trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as name,
    upper(
      left(coalesce(p.first_name, ''), 1) || left(coalesce(p.last_name, ''), 1)
    ) as initials,
    p.job_title_en,
    p.job_title_ar,
    p.color,
    p.avatar_url,
    case
      when count(t.id) = 0 then 0
      else round(100.0 * count(t.id) filter (where t.status = 'done') / count(t.id))
    end as progress,
    count(t.id) filter (where t.status = 'open') as active_tasks
  from public.profiles p
  left join public.tasks t on t.assigned_to = p.id
  where p.status = 'active'
    and p.deleted_at is null
  group by p.id, p.first_name, p.last_name, p.job_title_en, p.job_title_ar, p.color, p.avatar_url
  order by p.first_name;
$$;

grant execute on function public.get_team_progress() to authenticated;


drop function if exists public.get_leaderboard(text);

create or replace function public.get_leaderboard(p_period text default 'weekly')
returns table (
  rank            int,
  id              uuid,
  name            text,
  initials        text,
  color           text,
  avatar_url      text,
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
    p.avatar_url,
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
--   select id, name, avatar_url from get_team_progress();
--   select id, name, avatar_url from get_leaderboard('weekly');
--
-- avatar_url رح يطلع null لأي عضو لسا ما رفع صورة بروفايل — طبيعي،
-- مش خطأ. الفرونت هيعرض الأحرف الأولى بدالها تلقائيًا (نفس فولباك
-- Sidebar بالظبط).
-- ─────────────────────────────────────────────────────────────