-- =====================================================================
-- Migration 016: نظام الإشعارات
--
-- الفكرة المركزية: الجرس **مش سجل أحداث**، هو قائمة "شو محتاج انتباهك".
-- فلما أدمن يوافق على طلب تسجيل، الإشعار لازم يختفي عن باقي الأدمنية —
-- وإلا صاروا يفتحوا Admin Control ويلاقوا القائمة فاضية ويحسّوا إن
-- النظام بيكذب عليهم.
--
-- الحل: `resolution_key` — مفتاح مشترك بين كل نسخ نفس الحدث.
-- أول ما حدا يحسمه، كل النسخ بتنعلّم محلولة دفعة وحدة.
--
--   signup:<uuid>        → طلب تسجيل، بينحسم بالقبول أو الرفض
--   email_change:<uuid>  → طلب تغيير إيميل، بينحسم بالموافقة أو الرفض
--
-- الإشعارات الشخصية (تاسك، ملاحظة، رد) ما إلها مفتاح: ما في شي "يُحسم"
-- فيها، صاحبها بيقرأها وخلص.
--
-- التوليد بـ triggers مش بالـ Server Actions عن قصد: الحدث الواحد له
-- أكتر من مسار (تاسك بتنضاف من Admin Control، وبكرا من الداشبورد)، فلو
-- التوليد بالأكشن لازم نتذكره بكل مسار جديد.
-- =====================================================================

create type public.notification_type as enum (
  'task_assigned',
  'note_received',
  'note_reply',
  'signup_pending',
  'signup_resolved',          -- لباقي الأدمنية: فلان حسم الطلب
  'account_approved',
  'account_rejected',
  'email_change_pending',
  'email_change_approved',
  'email_change_rejected',
  'news_published'
);

create table public.notifications (
  id             uuid primary key default gen_random_uuid(),
  recipient_id   uuid not null references public.profiles(id) on delete cascade,
  type           public.notification_type not null,
  -- مين سبّب الحدث. null للأحداث النظامية
  actor_id       uuid references public.profiles(id) on delete set null,
  -- العنصر المقصود — عشان الضغط يودّي له تحديدًا مش لصفحته فقط
  entity_type    text,
  entity_id      uuid,
  subject        text not null default '',
  href           text not null,
  -- المفتاح المشترك للأحداث الجماعية. null = إشعار شخصي ما إله حسم
  resolution_key text,
  is_read        boolean not null default false,
  read_at        timestamptz,
  -- انحسم من حدا تاني
  resolved_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

-- عدّاد الجرس بيقرأ من هون — جزئي عشان يضل صغير مهما تراكم الأرشيف
create index notifications_unread_idx
  on public.notifications (recipient_id)
  where is_read = false;

create index notifications_resolution_idx
  on public.notifications (resolution_key)
  where resolution_key is not null;

-- ---------------------------------------------------------------------
-- RLS — المستلم فقط، ولا أحد يكتب من التطبيق
-- ---------------------------------------------------------------------

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (recipient_id = auth.uid());

-- ⚠️ ما في سياسة INSERT إطلاقًا — الإشعارات بتتولد من triggers فقط.
-- لو سمحنا للتطبيق يكتب، أي حدا بيبعت لنفسه أو لغيره إشعارات مزوّرة.

grant select, delete on public.notifications to authenticated;
-- التحديث محصور بعمودي القراءة: ما حدا يزوّر نوع إشعار ولا وجهته
grant update (is_read, read_at) on public.notifications to authenticated;

-- ---------------------------------------------------------------------
-- دوال التوليد
-- ---------------------------------------------------------------------

create or replace function public.notify_user(
  p_recipient      uuid,
  p_type           public.notification_type,
  p_actor          uuid,
  p_entity_type    text,
  p_entity_id      uuid,
  p_subject        text,
  p_href           text,
  p_resolution_key text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ما بنعلّم حدا على فعل نفسه
  if p_recipient is null or p_recipient = p_actor then
    return;
  end if;

  -- ولا بنبعت لحساب محذوف أو مش مفعّل
  if not exists (
    select 1 from public.profiles
    where id = p_recipient and status = 'active' and deleted_at is null
  ) then
    return;
  end if;

  insert into public.notifications (
    recipient_id, type, actor_id, entity_type, entity_id,
    subject, href, resolution_key
  )
  values (
    p_recipient, p_type, p_actor, p_entity_type, p_entity_id,
    coalesce(p_subject, ''), p_href, p_resolution_key
  );
end;
$$;

-- بث لكل من يملك صلاحية معيّنة (أو Chief/Developer)
create or replace function public.notify_permitted(
  p_permission     text,
  p_type           public.notification_type,
  p_actor          uuid,
  p_entity_type    text,
  p_entity_id      uuid,
  p_subject        text,
  p_href           text,
  p_resolution_key text default null,
  p_exclude        uuid default null
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
       and (
         p.is_chief
         or p.is_developer
         or (p.access_role = 'admin' and public.has_permission(p.id, p_permission))
       )
  loop
    perform public.notify_user(
      r.id, p_type, p_actor, p_entity_type, p_entity_id,
      p_subject, p_href, p_resolution_key
    );
  end loop;
end;
$$;

-- حسم مجموعة: كل نسخ نفس الحدث بتنعلّم مقروءة ومحلولة دفعة وحدة.
-- هون بالضبط اللي بيخلي النظام "ذكي": أدمن واحد يتصرّف، والباقي ما
-- بيلاحقوا طلبًا انتهى.
create or replace function public.resolve_notification_group(
  p_key      text,
  p_resolver uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_key is null then
    return 0;
  end if;

  update public.notifications
     set resolved_at = now(),
         is_read     = true,
         read_at     = coalesce(read_at, now())
   where resolution_key = p_key
     and resolved_at is null;

  get diagnostics v_count = row_count;
  perform p_resolver;  -- محفوظ للتوسعة: سجل "مين حسمها"
  return v_count;
end;
$$;

grant execute on function public.resolve_notification_group(text, uuid) to authenticated;

-- =====================================================================
-- المصادر — triggers على الجداول الموجودة
-- =====================================================================

-- 1. تاسك جديدة انعطت لعضو
create or replace function public.trg_notify_task_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_user(
    new.assigned_to, 'task_assigned', new.created_by,
    'task', new.id, new.title,
    '/my-tasks#task-' || new.id::text
  );
  return new;
end;
$$;

create trigger trg_tasks_notify
  after insert on public.tasks
  for each row execute function public.trg_notify_task_assigned();

-- 2. ملاحظة مدير جديدة
create or replace function public.trg_notify_note_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_user(
    new.member_id, 'note_received', new.author_id,
    'director_note', new.id, new.title,
    '/my-tasks#note-' || new.id::text
  );
  return new;
end;
$$;

create trigger trg_director_notes_notify
  after insert on public.director_notes
  for each row execute function public.trg_notify_note_received();

-- 3. رد على ملاحظة — بيروح للطرف الآخر
create or replace function public.trg_notify_note_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid;
  v_author uuid;
  v_recipient uuid;
begin
  select member_id, author_id into v_member, v_author
    from public.director_notes where id = new.note_id;

  -- الاتجاه من دور الكاتب: رد العضو للمدير، ورد المدير للعضو.
  -- author_role محسوب بـ trigger فما بينزوّر.
  v_recipient := case when new.author_role = 'member' then v_author else v_member end;

  perform public.notify_user(
    v_recipient, 'note_reply', new.author_id,
    'director_note', new.note_id, left(new.text, 80),
    '/my-tasks#note-' || new.note_id::text
  );
  return new;
end;
$$;

create trigger trg_note_replies_notify
  after insert on public.note_replies
  for each row execute function public.trg_notify_note_reply();

-- 4. دورة حياة الحساب — البث ثم الحسم
create or replace function public.trg_notify_account_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key    text := 'signup:' || new.id::text;
  v_name   text := btrim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, ''));
  v_actor  uuid;
begin
  -- (أ) طلب جديد → بث لكل من يقدر يوافق
  if tg_op = 'INSERT' then
    if new.status = 'pending_approval' then
      perform public.notify_permitted(
        'members.manage', 'signup_pending', new.id,
        'profile', new.id, v_name, '/adminControl#pending', v_key
      );
    end if;
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status = 'pending_approval' and new.status in ('active', 'rejected') then
    v_actor := coalesce(new.approved_by, new.rejected_by);

    -- (ب) انحسم → كل نسخ البث بتنعلّم محلولة
    perform public.resolve_notification_group(v_key, v_actor);

    -- (ج) وبدلها بث يقول مين تصرّف — عشان الطلب ما يختفي بصمت
    perform public.notify_permitted(
      'members.manage', 'signup_resolved', v_actor,
      'profile', new.id, v_name, '/adminControl', null, v_actor
    );

    -- (د) وإشعار شخصي لصاحب الحساب
    perform public.notify_user(
      new.id,
      case when new.status = 'active' then 'account_approved' else 'account_rejected' end,
      v_actor, 'profile', new.id, '',
      case when new.status = 'active' then '/dashboard' else '/login' end
    );
  end if;

  return new;
end;
$$;

create trigger trg_profiles_notify
  after insert or update of status on public.profiles
  for each row execute function public.trg_notify_account_lifecycle();

-- 5. طلبات تغيير الإيميل — نفس نمط البث والحسم
create or replace function public.trg_notify_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := 'email_change:' || new.id::text;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending_admin' then
      perform public.notify_permitted(
        'members.manage', 'email_change_pending', new.user_id,
        'email_change_request', new.id, new.new_email,
        '/profile/' || new.user_id::text, v_key
      );
    end if;
    return new;
  end if;

  if old.status = 'pending_admin' and new.status <> 'pending_admin' then
    perform public.resolve_notification_group(v_key, new.reviewed_by);
    perform public.notify_user(
      new.user_id, 'email_change_approved', new.reviewed_by,
      'email_change_request', new.id, new.new_email, '/profile'
    );
  end if;

  return new;
end;
$$;

create trigger trg_email_change_notify
  after insert or update of status on public.email_change_requests
  for each row execute function public.trg_notify_email_change();

-- ⚠️ الرفض بيحذف الصف (ما في حالة `rejected` بالـ enum)، فالتنظيف
-- لازم يصير على DELETE مش UPDATE.
create or replace function public.trg_notify_email_change_rejected()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'pending_admin' then
    perform public.resolve_notification_group('email_change:' || old.id::text, auth.uid());
    perform public.notify_user(
      old.user_id, 'email_change_rejected', auth.uid(),
      'email_change_request', old.id, old.new_email, '/profile'
    );
  end if;
  return old;
end;
$$;

create trigger trg_email_change_rejected_notify
  before delete on public.email_change_requests
  for each row execute function public.trg_notify_email_change_rejected();

-- ---------------------------------------------------------------------
-- التنظيف — الجدول بيتراكم للأبد بدونه
-- ---------------------------------------------------------------------
-- الجدولة بتحتاج pg_cron (Supabase Pro):
--   select cron.schedule('purge-notifications', '0 4 * * *',
--                        'select public.purge_old_notifications()');
create or replace function public.purge_old_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with purged as (
    delete from public.notifications
     where (is_read and created_at < now() - interval '30 days')
        or created_at < now() - interval '90 days'
    returning id
  )
  select count(*) into v_count from purged;
  return v_count;
end;
$$;