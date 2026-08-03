-- =====================================================================
-- Migration 019: روابط إشعارات دقيقة لكل نوع
--
-- نصف أنواع الإشعارات كانت بتوجّه لصفحة عامة بدون hash — يعني العضو
-- بيوصل الصفحة وبيدوّر بنفسه، وهذا نص فائدة الجرس ضايعة. كل إشعار
-- فيه عنصر محدد لازم رابطه يوصله لهيك.
--
-- الاصطلاح: `#<entity>-<id>` بالصفحة المعنية، والواجهة بتتعرف عليه.
-- =====================================================================

-- 1. طلب تغيير إيميل بانتظار موافقة الأدمن — hash لقسم الطلب بصفحة العضو
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
        '/profile/' || new.user_id::text || '#email-change-request',
        v_key
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
      'email_change_request', new.id, new.new_email,
      -- الطلب خلص وانحذف مفهوميًا (بيصير completed) — نوجّه لحقل
      -- الإيميل بصفحة بروفايله هو، مش لطلب ما عاد موجود
      '/profile#email-field'
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
      'email_change_request', old.id, old.new_email,
      '/profile#email-field'
    );
  end if;
  return old;
end;
$$;

-- 2. ملاحظة مدير من جهة الأدمن (على تاسك/ملاحظة عضو) — لازم الرابط
--    يحمل مين العضو، عشان صفحة الأدمن تقدر تختاره تلقائيًا قبل ما
--    تسكرول للعنصر. صيغة: ?member=<id>#note-<id>
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
  v_href      text;
begin
  select member_id, author_id into v_member, v_author
    from public.director_notes where id = new.note_id;

  v_recipient := case when new.author_role = 'member' then v_author else v_member end;

  /*
    رد العضو بيروح للمدير → بيفتح Admin Control على نفس العضو.
    رد المدير بيروح للعضو → بيفتح My Tasks مباشرة (بلا اختيار عضو).
  */
  if v_recipient = v_author then
    v_href := '/my-tasks#note-' || new.note_id::text;
  else
    v_href := '/adminControl?member=' || v_member::text || '#note-' || new.note_id::text;
  end if;

  perform public.notify_user(
    v_recipient,
    'note_reply'::public.notification_type,
    new.author_id,
    'director_note', new.note_id, left(new.text, 80),
    v_href
  );
  return new;
end;
$$;

-- 3. طلب تسجيل بانتظار الموافقة — hash لقسم الطلبات المعلّقة
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
  v_type   public.notification_type;
  v_href   text;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending_approval' then
      perform public.notify_permitted(
        'members.manage',
        'signup_pending'::public.notification_type,
        new.id,
        'profile', new.id, v_name,
        '/adminControl#pending-approvals',
        v_key
      );
    end if;
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status = 'pending_approval' and new.status in ('active', 'rejected') then
    v_actor := coalesce(new.approved_by, new.rejected_by);

    perform public.resolve_notification_group(v_key, v_actor);
    perform public.notify_permitted(
      'members.manage',
      'signup_resolved'::public.notification_type,
      v_actor,
      'profile', new.id, v_name, '/adminControl', null, v_actor
    );

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