-- =====================================================================
-- Migration: تصحيح رابط إشعار "تاسك سلّمت للمراجعة"
--
-- الخطأ: كان الرابط /my-tasks/{taskId} — هاي صفحة تفاصيل التاسك من
-- منظور صاحبها (assigned_to) فقط. المستقبِل الفعلي لهاد الإشعار هو
-- المراجع (created_by أو الشيف أدمن)، مش صاحب التاسك — فلما يضغط
-- عليه كان بيوصل 404 (تاسك مش إله).
--
-- الصح: نفس نمط note_reply — يوجّه لـ Admin Control مع تحديد العضو
-- تلقائيًا، عشان صفحة المراجعة تفتح مباشرة على العضو الصح.
-- =====================================================================

create or replace function public.trg_notify_task_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key      text := 'task_review:' || new.id::text;
  v_chief_id uuid;
  v_review_href text;
begin
  if old.status = new.status then
    return new;
  end if;

  -- (أ) العضو سلّم: open → pending_review
  if old.status = 'open' and new.status = 'pending_review' then
    v_review_href := '/adminControl?member=' || new.assigned_to::text || '#task-' || new.id::text;

    perform public.notify_user(
      new.created_by,
      'task_submitted'::public.notification_type,
      new.assigned_to,
      'task', new.id, new.title,
      v_review_href,
      v_key
    );

    select id into v_chief_id
      from public.profiles
     where is_chief = true and id <> new.created_by
     limit 1;

    if v_chief_id is not null then
      perform public.notify_user(
        v_chief_id,
        'task_submitted'::public.notification_type,
        new.assigned_to,
        'task', new.id, new.title,
        v_review_href,
        v_key
      );
    end if;

    return new;
  end if;

  -- (ب) الأدمن وافق: pending_review → done — رابط صاحب التاسك، صحيح كما هو
  if old.status = 'pending_review' and new.status = 'done' then
    perform public.resolve_notification_group(v_key, new.reviewed_by);

    perform public.notify_user(
      new.assigned_to,
      'task_approved'::public.notification_type,
      new.reviewed_by,
      'task', new.id, new.title,
      '/my-tasks/' || new.id::text
    );

    return new;
  end if;

  -- (ج) الأدمن رفض: pending_review → open — رابط صاحب التاسك، صحيح كما هو
  if old.status = 'pending_review' and new.status = 'open'
     and old.last_rejection_note is distinct from new.last_rejection_note then

    perform public.resolve_notification_group(v_key, new.reviewed_by);

    perform public.notify_user(
      new.assigned_to,
      'task_rejected'::public.notification_type,
      new.reviewed_by,
      'task', new.id, new.title,
      '/my-tasks/' || new.id::text
    );

    return new;
  end if;

  return new;
end;
$$;