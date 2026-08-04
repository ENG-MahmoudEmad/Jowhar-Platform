-- migration: 20260803121100_news_feed.sql
-- المكان: supabase/migrations/20260803121100_news_feed.sql
-- شغّلها بـ: supabase db push (تأكد إنها آخر مايجريشن بالترتيب عندك قبل)

-- ─────────────────────────────────────────────────────────────
-- 1. news_posts
-- ─────────────────────────────────────────────────────────────
create table public.news_posts (
  id         integer generated always as identity primary key,
  type       text not null check (type in ('announcement', 'update', 'alert')),
  title_en   text not null,
  title_ar   text not null,
  body       text not null,
  image_url  text,
  author_id  uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_news_posts_created_at on public.news_posts(created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 2. post_likes — مفتاح مركّب (post_id, user_id) هو الضمانة الحقيقية:
--    حتى طلب مكرر أو ضغطة مزدوجة فلتت من الواجهة ما بتقدر تسجّل صفين.
-- ─────────────────────────────────────────────────────────────
create table public.post_likes (
  post_id    integer not null references public.news_posts(id) on delete cascade,
  user_id    uuid    not null references public.profiles(id)   on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index idx_post_likes_post on public.post_likes(post_id);

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table public.news_posts enable row level security;
alter table public.post_likes enable row level security;

create policy "authenticated can read news"
  on public.news_posts for select
  to authenticated
  using (true);

create policy "news.publish can write news"
  on public.news_posts for all
  to authenticated
  using (public.has_admin_capability('news.publish'))
  with check (public.has_admin_capability('news.publish'));

create policy "authenticated can read likes"
  on public.post_likes for select
  to authenticated
  using (true);

-- أي عضو (مش بس الأدمن) بيقدر يلايك — بس على صفه هو بس
create policy "users manage their own likes"
  on public.post_likes for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select on public.news_posts to authenticated;
grant insert, update, delete on public.news_posts to authenticated;
grant select on public.post_likes to authenticated;
grant insert, delete on public.post_likes to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. Storage bucket لصور الأخبار — عام بالقراءة، رفع محصور بصلاحية
--    news.publish بس (زي صور البروفايل تمامًا).
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do nothing;

create policy "public can view news images"
  on storage.objects for select
  using (bucket_id = 'news-images');

create policy "news.publish can upload news images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'news-images' and public.has_admin_capability('news.publish'));

create policy "news.publish can delete news images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'news-images' and public.has_admin_capability('news.publish'));

-- ─────────────────────────────────────────────────────────────
-- 4. RPC: get_news_feed() — التغذية كاملة مع بيانات الكاتب + حالة اللايك
-- ─────────────────────────────────────────────────────────────
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
    (select count(*)::int from public.post_likes pl where pl.post_id = p.id) as likes_count,
    exists(
      select 1 from public.post_likes pl2
      where pl2.post_id = p.id and pl2.user_id = auth.uid()
    ) as liked_by_me
  from public.news_posts p
  join public.profiles a on a.id = p.author_id
  order by p.created_at desc;
$$;

grant execute on function public.get_news_feed() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. RPC: toggle_post_like() — insert أو delete حسب الحالة الحالية،
--    وبيرجّع الحالة الجديدة + العدّاد بطلب واحد (بدل read-then-write
--    من الكلاينت).
-- ─────────────────────────────────────────────────────────────
create or replace function public.toggle_post_like(p_post_id integer)
returns table (liked boolean, likes_count int)
language plpgsql
as $$
declare
  v_liked boolean;
begin
  if exists (
    select 1 from public.post_likes
    where post_id = p_post_id and user_id = auth.uid()
  ) then
    delete from public.post_likes
    where post_id = p_post_id and user_id = auth.uid();
    v_liked := false;
  else
    insert into public.post_likes (post_id, user_id)
    values (p_post_id, auth.uid());
    v_liked := true;
  end if;

  return query
    select v_liked, (select count(*)::int from public.post_likes where post_id = p_post_id);
end;
$$;

grant execute on function public.toggle_post_like(integer) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- تجربة بالـ SQL Editor بعد التشغيل:
--
--   select * from get_news_feed();
--   -- لازم يرجّع صفوف فاضية (0 صف)، طبيعي، لسا ما نشرنا شي
--
--   select * from permissions where key = 'news.publish';
--   -- تأكيد إنها موجودة أصلاً (يفترض صف واحد)
--
--   select id, public from storage.buckets where id = 'news-images';
--   -- لازم public = true
-- ─────────────────────────────────────────────────────────────