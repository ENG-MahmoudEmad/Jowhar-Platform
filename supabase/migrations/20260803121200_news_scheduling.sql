-- migration: 20260803121200_news_scheduling.sql
-- المكان: supabase/migrations/20260803121200_news_scheduling.sql
-- شغّلها بـ: supabase db push (تأكد إنها آخر مايجريشن بالترتيب عندك قبل)

-- publish_at فاضي = ينشر فورًا (الوضع الحالي). لو محدد وبالمستقبل،
-- الخبر "قادم" — ظاهر للأدمن (news.publish) بس، مخفي عن باقي الأعضاء.
--
-- expires_at فاضي = ما بينتهي أبدًا. لو محدد وفات وقته، الخبر بيختفي
-- من الكل بلا استثناء (حتى الأدمن) — مطابق لقرارك بالمحادثة.
alter table public.news_posts
  add column publish_at timestamptz,
  add column expires_at timestamptz;

drop function if exists public.get_news_feed();

create or replace function public.get_news_feed()
returns table (
  id                 integer,
  type               text,
  title_en           text,
  title_ar           text,
  body               text,
  image_url          text,
  author_id          uuid,
  author_name        text,
  author_initials    text,
  author_color       text,
  author_avatar_url  text,
  created_at         timestamptz,
  publish_at         timestamptz,
  expires_at         timestamptz,
  is_upcoming        boolean,
  likes_count        int,
  liked_by_me        boolean
)
language sql
stable
as $$
  select
    p.id, p.type, p.title_en, p.title_ar, p.body, p.image_url, p.author_id,
    trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')) as author_name,
    upper(
      left(coalesce(a.first_name, ''), 1) || left(coalesce(a.last_name, ''), 1)
    ) as author_initials,
    a.color as author_color,
    a.avatar_url as author_avatar_url,
    p.created_at,
    p.publish_at,
    p.expires_at,
    (p.publish_at is not null and p.publish_at > now()) as is_upcoming,
    (select count(*)::int from public.post_likes pl where pl.post_id = p.id) as likes_count,
    exists(
      select 1 from public.post_likes pl2
      where pl2.post_id = p.id and pl2.user_id = auth.uid()
    ) as liked_by_me
  from public.news_posts p
  join public.profiles a on a.id = p.author_id
  where
    -- انتهت صلاحيته؟ يختفي من الكل، بلا استثناء
    (p.expires_at is null or p.expires_at > now())
    and (
      -- مش مجدول لسا (نشر فوري أو وصل وقته) → ظاهر للكل
      p.publish_at is null or p.publish_at <= now()
      -- أو مجدول للمستقبل، بس بيشوفه بس حامل صلاحية news.publish
      or public.has_admin_capability('news.publish')
    )
  order by p.created_at desc;
$$;

grant execute on function public.get_news_feed() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- تجربة بالـ SQL Editor بعد التشغيل:
--
--   select * from get_news_feed();
--   -- المفروض يشتغل عادي زي قبل (الأعمدة الجديدة بترجع null للأخبار
--   -- الموجودة، is_upcoming = false)
--
--   -- تجربة خبر مجدول للمستقبل (بدّل الـ id بخبر حقيقي عندك):
--   update news_posts set publish_at = now() + interval '2 days' where id = 1;
--   select * from get_news_feed();
--   -- لازم is_upcoming = true للخبر هذا
--
--   -- رجّعه زي ما كان:
--   update news_posts set publish_at = null where id = 1;
-- ─────────────────────────────────────────────────────────────