-- =====================================================================
-- Migration: تضمين نوع الخبر (announcement/update/alert) بإشعار النشر
--
-- المشكلة: trg_notify_news_published() و notify_due_news_posts() كانوا
-- عم يبعتوا entity_type ثابت 'news_post' دايمًا، فالواجهة (NotificationItem)
-- ما كان عندها طريقة تعرف نوع الخبر الفعلي، فكانت تطلع جملة ثابتة
-- "published an update" حتى لو الخبر كان announcement أو alert.
--
-- الحل: entity_type نص حر أصلًا (مش enum) — منحط فيه نوع الخبر كمان
-- بصيغة 'news_post:<type>' بدل 'news_post' وحدها. entity_id ضل null
-- زي ما كان (نفس سبب migration 189: news_posts.id مش uuid).
-- =====================================================================

create or replace function public.trg_notify_news_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.publish_at is null or new.publish_at <= now() then
    perform public.notify_all_active(
      'news_published'::public.notification_type,
      new.author_id,
      'news_post:' || new.type, null,
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
    select id, author_id, title_ar, title_en, type
      from public.news_posts
     where publish_at is not null
       and publish_at <= now()
       and notified_at is null
  loop
    perform public.notify_all_active(
      'news_published'::public.notification_type,
      r.author_id,
      'news_post:' || r.type, null,
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