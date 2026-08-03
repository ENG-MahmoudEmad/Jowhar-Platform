-- migration: 20260803120200_get_team_progress.sql
-- المكان: supabase/migrations/20260803120200_get_team_progress.sql
-- شغّلها بـ: supabase db push (بعد ما تتأكد إنها آخر مايجريشن بالترتيب عندك)

create or replace function public.get_team_progress()
returns table (
  id            uuid,
  name          text,
  initials      text,
  job_title_en  text,
  job_title_ar  text,
  color         text,
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
    case
      when count(t.id) = 0 then 0
      else round(100.0 * count(t.id) filter (where t.status = 'done') / count(t.id))
    end as progress,
    count(t.id) filter (where t.status = 'open') as active_tasks
  from public.profiles p
  left join public.tasks t on t.assigned_to = p.id
  where p.status = 'active'
    and p.deleted_at is null
  group by p.id, p.first_name, p.last_name, p.job_title_en, p.job_title_ar, p.color
  order by p.first_name;
$$;

grant execute on function public.get_team_progress() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- تجربة بالـ SQL Editor بعد التشغيل:
--
--   select * from get_team_progress();
--
-- لازم يرجعلك صف لكل عضو status = active وغير محذوف، مع نسبة
-- إنجاز صحيحة وعدد تاسكات مفتوحة صحيح. لو عضو بلا تاسكات إطلاقًا،
-- progress لازم يطلع 0 مش خطأ.
--
-- ⚠️ لو رجّعت الدالة صفوف أقل مما تتوقع (مثلاً أعضاء موجودين
-- بس مش ظاهرين)، جرّب السبب الأرجح: RLS على profiles أو tasks
-- بيمنع القراءة الكاملة. جرّب:
--
--   select count(*) from profiles where status = 'active';
--   select count(*) from tasks;
--
-- ولو الأرقام أقل من المتوقع وانت مسجّل دخول كأدمن/تشيف، ابعتلي
-- النتيجة ونشوف سياسة الـ RLS سوا.
-- ─────────────────────────────────────────────────────────────