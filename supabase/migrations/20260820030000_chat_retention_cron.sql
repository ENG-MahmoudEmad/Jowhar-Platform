-- supabase/migrations/20260820030000_chat_retention_cron.sql

-- ============================================================
-- Chat Feature — Migration 4/N
-- دالة الحذف التلقائي للأرشيف (نافذة بحدود ثابتة) + منطق تنبيه الـ10 أيام
-- تُستدعى دورياً عبر Supabase Scheduled Function / pg_cron
-- ============================================================

-- ------------------------------------------------------------
-- منطق النافذة (خيار ب المُعتمد):
--
-- بمدة N أشهر (retention_months)، الأرشيف مقسّم لفترات ثابتة طولها N/2:
--   لو N=6  → فترات كل 3 أشهر (يبقى دايماً آخر 6 أشهر: فترتين)
--   لو N=12 → فترات كل 6 أشهر (يبقى دايماً آخر سنة: فترتين)
--   لو N=3  → فترات كل 1.5 شهر (يبقى دايماً آخر 3 أشهر: فترتين)
--   لو N=1  → فترات كل نصف شهر
--
-- كل ما فترة جديدة تخلص، أقدم فترة بتصير خارج النافذة وتصير مؤهلة للحذف.
-- التنبيه بينبعث قبل 10 أيام من موعد الحذف الفعلي لكل فترة.
-- ------------------------------------------------------------

create or replace function public.run_chat_retention_cycle()
returns table(action text, range_start timestamptz, range_end timestamptz, affected integer)
language plpgsql
security definer
as $$
declare
  v_retention_months  smallint;
  v_period_length     interval;
  v_epoch_anchor       timestamptz := timestamptz '2026-01-01 00:00:00+00';  -- نقطة انطلاق ثابتة لحساب حدود الفترات
  v_now                timestamptz := now();
  v_period_index       bigint;
  v_current_period_start timestamptz;
  v_oldest_kept_start  timestamptz;
  v_deletable_end      timestamptz;
  r                    record;
  v_warn_count         integer;
  v_del_count          integer;
begin
  select retention_months into v_retention_months from public.chat_retention_settings where id = 1;
  v_period_length := (v_retention_months::text || ' months')::interval / 2;

  -- رقم الفترة الحالية بالنسبة لنقطة الانطلاق الثابتة
  v_period_index := floor(extract(epoch from (v_now - v_epoch_anchor)) / extract(epoch from v_period_length));
  v_current_period_start := v_epoch_anchor + (v_period_index * v_period_length);

  -- أقدم فترة لازم تبقى (بداية النافذة الحالية = فترتين للوراء من الحالية)
  v_oldest_kept_start := v_current_period_start - v_period_length;

  -- أي شي أقدم من v_oldest_kept_start مؤهل للحذف
  v_deletable_end := v_oldest_kept_start;

  -- ---------------------------------------------------------
  -- الخطوة 1: تنبيه مسبق — لو باقي 10 أيام أو أقل على أقرب فترة رح
  -- تصير مؤهلة للحذف، وما انبعث تنبيه إلها من قبل
  -- ---------------------------------------------------------
  for r in
    select
      (v_oldest_kept_start - v_period_length) as p_start,
      v_oldest_kept_start as p_end
    where (v_oldest_kept_start - (v_oldest_kept_start - v_period_length)) is not null
  loop
    if (r.p_end - v_now) <= interval '10 days' and (r.p_end - v_now) > interval '0 days'
       and not exists (
         select 1 from public.chat_deletion_log
         where range_start = r.p_start and range_end = r.p_end and warning_sent_at is not null
       )
       and exists (
         select 1 from public.chat_messages
         where created_at >= r.p_start and created_at < r.p_end and deleted_at is null
       )
    then
      insert into public.chat_deletion_log (range_start, range_end, warning_sent_at)
      values (r.p_start, r.p_end, now());

      select count(*) into v_warn_count
      from public.chat_messages
      where created_at >= r.p_start and created_at < r.p_end and deleted_at is null;

      -- تنبيه كل الأعضاء النشطين (مش بس أعضاء قناة معينة — الإعداد عام على كل القنوات)
      perform public.notify_chat_user(
        p.id, 'deletion_warning', null, null, null,
        to_char(r.p_start, 'YYYY-MM-DD') || ' → ' || to_char(r.p_end, 'YYYY-MM-DD'),
        '/chat'
      )
      from public.profiles p
      where p.status = 'active' and p.deleted_at is null;

      return query select 'warning'::text, r.p_start, r.p_end, v_warn_count;
    end if;
  end loop;

  -- ---------------------------------------------------------
  -- الخطوة 2: التنفيذ الفعلي — أي فترة صارت خارج النافذة فعلياً
  -- (ولسه ما اتنفّذ حذفها) تُحذف الآن
  -- ---------------------------------------------------------
  for r in
    select distinct range_start as p_start, range_end as p_end
    from public.chat_deletion_log
    where warning_sent_at is not null
      and executed_at is null
      and range_end <= v_oldest_kept_start
  loop
    update public.chat_messages
    set content = null,
        deleted_at = now(),
        deleted_by = null   -- حذف نظامي، مو من عضو
    where created_at >= r.p_start and created_at < r.p_end and deleted_at is null;

    get diagnostics v_del_count = row_count;

    update public.chat_deletion_log
    set executed_at = now(), messages_deleted = v_del_count
    where range_start = r.p_start and range_end = r.p_end and executed_at is null;

    return query select 'executed'::text, r.p_start, r.p_end, v_del_count;
  end loop;

  return;
end;
$$;

comment on function public.run_chat_retention_cycle is
  'تُستدعى دورياً (يومياً) عبر Supabase Scheduled Function. تفحص وترسل تنبيهات الـ10 أيام، وتنفّذ الحذف الفعلي للفترات اللي خرجت من نافذة الاحتفاظ. الحذف الفعلي: مسح المحتوى (content=null) وتعليم deleted_at، مش حذف الصف فعلياً — يحافظ على سلامة الـ foreign keys (ردود/فوروورد قديمة).';

-- ------------------------------------------------------------
-- تفعيل الجدولة (يومياً الساعة 3 صباحاً بتوقيت الرياض، نفس نمط باقي
-- الـ cron jobs الموجودة بالمشروع مثل notify_due_news_posts)
-- ملاحظة: تفعيل pg_cron الفعلي يصير من لوحة تحكم Supabase
-- (Database → Cron Jobs) أو عبر migration منفصل حسب إعداد مشروعك،
-- لأنه بيحتاج extension pg_cron مفعّلة على مستوى المشروع أولاً.
-- ------------------------------------------------------------
-- select cron.schedule(
--   'chat-retention-daily',
--   '0 0 * * *',  -- 3 صباحاً بتوقيت الرياض = 00:00 UTC
--   $$ select public.run_chat_retention_cycle(); $$
-- );