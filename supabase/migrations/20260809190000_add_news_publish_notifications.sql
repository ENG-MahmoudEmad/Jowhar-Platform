-- =====================================================================
-- Migration: إشعارات نشر الأخبار
--
-- news_published كانت موجودة بالـ enum من migration 016 (البداية) بس
-- بدون أي trigger فعلي يربطها بـ news_posts.
--
-- التحدي: publish_at هو نفسه آلية الجدولة (مفيش عمود status منفصل)،
-- ومفيش pg_cron بالمشروع (Supabase Free) — فما نقدر نعتمد على جدولة
-- داخل الداتابيز نفسها. الحل: عمود notified_at كعلامة "انبعت إشعاره
-- ولا لسا"، + trigger للنشر الفوري، + دالة منفصلة يستدعيها Vercel Cron
-- كل كم دقيقة لالتقاط الأخبار المجدولة يلي وصل وقتها.
--
-- المستقبِل: كل الأعضاء الفعّالين ما عدا الكاتب نفسه — بدون أي استثناء
-- للأدوار (حتى لو الشيف أدمن هو الكاتب، الباقي كلهم بياخدوا الإشعار،
-- وحتى لو الديفيلوبر هو الكاتب، الشيف أدمن كمان بياخد).
-- =====================================================================

alter table public.news_posts
  add column if not exists notified_at timestamptz;

-- ---------------------------------------------------------------------
-- دالة بث عامة: كل الأعضاء الفعّالين ما عدا واحد (الكاتب) — نمط جديد
-- غير notify_permitted (يلي مبنية على صلاحية معيّنة). هون بدون شرط
-- صلاحية إطلاقًا، الخبر يوصل للجميع.
-- ---------------------------------------------------------------------

create or replace function public.notify_all_active(
  p_type        public.notification_type,
  p_actor       uuid,
  p_entity_type text,
  p_entity_id   uuid,
  p_subject     text,
  p_href        text,
  p_exclude     uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select p.id
      from public.profiles p
     where p.status = 'active'
       and p.deleted_at is null
       and (p_exclude is null or p.id <> p_exclude)
  loop
    perform public.notify_user(
      r.id, p_type, p_actor, p_entity_type, p_entity_id, p_subject, p_href
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- النشر الفوري: خبر بدون جدولة (publish_at فاضي أو بالماضي/الحاضر)
-- بيبعت إشعاره فورًا وقت الإضافة، ويُعلَّم notified_at بنفس اللحظة.
-- خبر مجدول للمستقبل ما بيعمل هون شي — بينتظر notify_due_news_posts().
-- ---------------------------------------------------------------------

create or replace function public.trg_notify_news_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.publish_at is null or new.publish_at <= now() then
    -- ⚠️ entity_id بجدول notifications نوعه uuid، بس news_posts.id
    -- integer عادي — ما بينفع cast مباشر. بنمرر null، والـ href
    -- (فيه #post-{id} أصلًا) كافي للوصول للعنصر المحدد.
    perform public.notify_all_active(
      'news_published'::public.notification_type,
      new.author_id,
      'news_post', null,
      coalesce(new.title_ar, new.title_en),
      '/news#post-' || new.id::text,
      new.author_id
    );

    update public.news_posts
       set notified_at = now()
     where id = new.id;
  end if;

  return new;
end;
$$;

create trigger trg_news_posts_notify
  after insert on public.news_posts
  for each row execute function public.trg_notify_news_published();

-- ---------------------------------------------------------------------
-- الأخبار المجدولة: تُستدعى من Vercel Cron كل 5 دقايق.
-- بتلقط أي خبر publish_at وصل وقته ولسا notified_at فاضي (يعني كان
-- مجدول للمستقبل وقت الإضافة، ولسا ما انبعت إشعاره).
-- ---------------------------------------------------------------------

create or replace function public.notify_due_news_posts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select id, author_id, title_ar, title_en
      from public.news_posts
     where publish_at is not null
       and publish_at <= now()
       and notified_at is null
  loop
    perform public.notify_all_active(
      'news_published'::public.notification_type,
      r.author_id,
      'news_post', null,
      coalesce(r.title_ar, r.title_en),
      '/news#post-' || r.id::text,
      r.author_id
    );

    update public.news_posts set notified_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;