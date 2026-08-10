-- migration: 20260809210004_update_get_news_feed_image_layout.sql
-- المكان: supabase/migrations/20260809210004_update_get_news_feed_image_layout.sql
-- شغّلها بـ: supabase db push

-- ─────────────────────────────────────────────────────────────
-- تحديث get_news_feed() عشان ترجّع أعمدة تخطيط الصورة الجديدة
-- (image_aspect / image_position_x / image_position_y) اللي أضيفت
-- بميجريشن add_news_image_layout — بدونها الفرونت إند كان يوصله
-- undefined لهاي الحقول ويرجع تلقائيًا للإعدادات الافتراضية
-- (landscape / 50 / 50) بغض النظر عن اختيار الناشر الفعلي.
--
-- نفس منطق نسخة news_scheduling بالظبط (الفلترة، is_upcoming، الترتيب)
-- — بس مضاف عليها 3 أعمدة بس، بلا أي تغيير تاني.
-- ─────────────────────────────────────────────────────────────

drop function if exists public.get_news_feed();

create or replace function public.get_news_feed()
returns table (
  id                 integer,
  type               text,
  title_en           text,
  title_ar           text,
  body               text,
  image_url          text,
  image_aspect       text,
  image_position_x   smallint,
  image_position_y   smallint,
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
    p.id, p.type, p.title_en, p.title_ar, p.body, p.image_url,
    p.image_aspect, p.image_position_x, p.image_position_y,
    p.author_id,
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
    (p.expires_at is null or p.expires_at > now())
    and (
      p.publish_at is null or p.publish_at <= now()
      or public.has_admin_capability('news.publish')
    )
  order by p.created_at desc;
$$;

grant execute on function public.get_news_feed() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- تجربة بالـ SQL Editor بعد التشغيل:
--
--   select id, image_aspect, image_position_x, image_position_y
--   from get_news_feed();
--   -- لازم ترجع القيم الصحيحة (مش null) لكل خبر، مطابقة لما اخترته
--   -- وقت النشر بالـComposer.
-- ─────────────────────────────────────────────────────────────