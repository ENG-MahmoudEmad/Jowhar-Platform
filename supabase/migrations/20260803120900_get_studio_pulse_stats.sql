-- migration: 20260803120900_get_studio_pulse_stats.sql
-- المكان: supabase/migrations/20260803120900_get_studio_pulse_stats.sql
-- شغّلها بـ: supabase db push (تأكد إنها آخر مايجريشن بالترتيب عندك قبل)

create or replace function public.get_studio_pulse_stats()
returns table (
  tasks_completed_this_month     int,
  completion_rate_month_pct      int,
  completion_rate_overall_pct    int,
  most_active_member_id          uuid,
  most_active_member_name        text,
  most_active_member_initials    text,
  most_active_member_color       text,
  most_active_member_avatar_url  text,
  most_active_member_tasks_completed int
)
language sql
stable
as $$
  with month_bounds as (
    select
      date_trunc('month', (now() at time zone 'Asia/Riyadh'))::date as start_date,
      (date_trunc('month', (now() at time zone 'Asia/Riyadh')) + interval '1 month')::date as end_date
  ),
  -- تاسكات "هالشهر" = أي تاسك فترته بتتقاطع مع الشهر الحالي (نفس منطق
  -- Calendar وLeaderboard)، مش بس اللي اتعمل create فيه.
  month_tasks as (
    select t.*
    from public.tasks t, month_bounds mb
    where t.start_date <= mb.end_date
      and t.end_date   >= mb.start_date
  ),
  completed_this_month as (
    select * from month_tasks where status = 'done'
  ),
  overall_stats as (
    select
      count(*) filter (where status = 'done') as done_count,
      count(*) as total_count
    from public.tasks
  ),
  month_active as (
    select assigned_to, count(*) as cnt
    from completed_this_month
    where assigned_to is not null
    group by assigned_to
    order by cnt desc
    limit 1
  )
  select
    (select count(*) from completed_this_month)::int as tasks_completed_this_month,
    case
      when (select count(*) from month_tasks) = 0 then 0
      else round(100.0 * (select count(*) from completed_this_month) / (select count(*) from month_tasks))
    end::int as completion_rate_month_pct,
    case
      when os.total_count = 0 then 0
      else round(100.0 * os.done_count / os.total_count)
    end::int as completion_rate_overall_pct,
    p.id as most_active_member_id,
    trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as most_active_member_name,
    upper(
      left(coalesce(p.first_name, ''), 1) || left(coalesce(p.last_name, ''), 1)
    ) as most_active_member_initials,
    p.color as most_active_member_color,
    p.avatar_url as most_active_member_avatar_url,
    ma.cnt::int as most_active_member_tasks_completed
  from overall_stats os
  left join month_active ma on true
  left join public.profiles p on p.id = ma.assigned_to;
$$;

grant execute on function public.get_studio_pulse_stats() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- تجربة بالـ SQL Editor بعد التشغيل:
--
--   select * from get_studio_pulse_stats();
--
-- لازم يرجّع صف واحد بس. لو ما في ولا تاسك done هالشهر، الأعمدة
-- المتعلقة بـ "أنشط عضو" (most_active_member_*) رح تطلع كلها null —
-- هاد طبيعي، الفرونت لازم يتعامل معه كـ "مافي بيانات كفاية بعد".
-- ─────────────────────────────────────────────────────────────