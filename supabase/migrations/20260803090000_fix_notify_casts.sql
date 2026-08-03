-- =====================================================================
-- Migration 018: cast صريح لأنواع الإشعارات
--
-- الخطأ: function public.notify_user(uuid, text, uuid, ...) does not exist
--
-- السبب: تعبير `case ... then 'account_approved' else 'account_rejected' end`
-- بيحسمه Postgres كـ `text` مش كـ `notification_type`، فما بيلاقي دالة
-- مطابقة — والفشل بيلغي الترانزاكشن كامل، يعني **قبول العضو نفسه بيفشل**.
--
-- الدرس: أي قيمة enum جاية من تعبير (مش حرف مباشر بمكان متوقّع) لازم
-- يكون عليها cast صريح `::public.notification_type`.
-- =====================================================================

create or replace function public.trg_notify_account_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key   text := 'signup:' || new.id::text;
  v_name  text := btrim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, ''));
  v_actor uuid;
  v_type  public.notification_type;
  v_href  text;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending_approval' then
      perform public.notify_permitted(
        'members.manage',
        'signup_pending'::public.notification_type,
        new.id,
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

    -- انحسم → كل نسخ البث بتنعلّم محلولة
    perform public.resolve_notification_group(v_key, v_actor);

    -- وبدلها بث يقول مين تصرّف — عشان الطلب ما يختفي بصمت
    perform public.notify_permitted(
      'members.manage',
      'signup_resolved'::public.notification_type,
      v_actor,
      'profile', new.id, v_name, '/adminControl', null, v_actor
    );

    /*
      المتغيّرات المُعرّفة بنوعها الصحيح بدل تعبير `case` inline —
      هيك ما في أي مجال لـ Postgres يحسمها كـ text.
    */
    if new.status = 'active' then
      v_type := 'account_approved';
      v_href := '/dashboard';
    else
      v_type := 'account_rejected';
      v_href := '/login';
    end if;

    perform public.notify_user(
      new.id, v_type, v_actor, 'profile', new.id, '', v_href
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- نفس المعالجة الوقائية لباقي الـ triggers
-- ---------------------------------------------------------------------

create or replace function public.trg_notify_task_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_user(
    new.assigned_to,
    'task_assigned'::public.notification_type,
    new.created_by,
    'task', new.id, new.title,
    '/my-tasks#task-' || new.id::text
  );
  return new;
end;
$$;

create or replace function public.trg_notify_note_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_user(
    new.member_id,
    'note_received'::public.notification_type,
    new.author_id,
    'director_note', new.id, new.title,
    '/my-tasks#note-' || new.id::text
  );
  return new;
end;
$$;

create or replace function public.trg_notify_note_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member    uuid;
  v_author    uuid;
  v_recipient uuid;
begin
  select member_id, author_id into v_member, v_author
    from public.director_notes where id = new.note_id;

  v_recipient := case when new.author_role = 'member' then v_author else v_member end;

  perform public.notify_user(
    v_recipient,
    'note_reply'::public.notification_type,
    new.author_id,
    'director_note', new.note_id, left(new.text, 80),
    '/my-tasks#note-' || new.note_id::text
  );
  return new;
end;
$$;

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
        'members.manage',
        'email_change_pending'::public.notification_type,
        new.user_id,
        'email_change_request', new.id, new.new_email,
        '/profile/' || new.user_id::text, v_key
      );
    end if;
    return new;
  end if;

  if old.status = 'pending_admin' and new.status <> 'pending_admin' then
    perform public.resolve_notification_group(v_key, new.reviewed_by);
    perform public.notify_user(
      new.user_id,
      'email_change_approved'::public.notification_type,
      new.reviewed_by,
      'email_change_request', new.id, new.new_email, '/profile'
    );
  end if;

  return new;
end;
$$;

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
      old.user_id,
      'email_change_rejected'::public.notification_type,
      auth.uid(),
      'email_change_request', old.id, old.new_email, '/profile'
    );
  end if;
  return old;
end;
$$;

-- إعادة تفعيل الترجر لو كان معطّلاً أثناء التشخيص
alter table public.profiles enable trigger trg_profiles_notify;