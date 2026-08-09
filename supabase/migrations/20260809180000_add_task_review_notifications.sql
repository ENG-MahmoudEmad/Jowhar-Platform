-- =====================================================================
-- Migration: إشعارات دورة تسليم/مراجعة التاسك
--
-- القيم (task_submitted, task_approved, task_rejected) كانت جاهزة
-- بالـ enum من migration 018، بنية صريحة إنه المنطق يجي بجلسة منفصلة.
-- هاي هي الجلسة.
--
-- القرار: المستقبِل لـ task_submitted هو created_by + الشيف أدمن (لو
-- مختلف) — لأن الاتنين مؤهلين يوافقوا/يرفضوا حسب قاعدة الصلاحيات
-- المحسومة بجزء 12 (assertCanReview). resolution_key موحّد عشان لو
-- واحد منهم تصرّف، إشعار التاني ينحسم تلقائيًا (نفس نمط طلبات التسجيل).
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
begin
  -- ما بنعمل شي إلا لو status فعليًا تغيّر
  if old.status = new.status then
    return new;
  end if;

  -- (أ) العضو سلّم: open → pending_review
  if old.status = 'open' and new.status = 'pending_review' then
    -- المستقبِل الأساسي: صاحب التاسك الأصلي
    perform public.notify_user(
      new.created_by,
      'task_submitted'::public.notification_type,
      new.assigned_to,
      'task', new.id, new.title,
      '/my-tasks/' || new.id::text,
      v_key
    );

    -- + الشيف أدمن، لو مختلف عن created_by (نفس صلاحية المراجعة)
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
        '/my-tasks/' || new.id::text,
        v_key
      );
    end if;

    return new;
  end if;

  -- (ب) الأدمن وافق: pending_review → done
  if old.status = 'pending_review' and new.status = 'done' then
    -- أي إشعارات "قيد المراجعة" مرتبطة بهاي التاسك تنحسم فورًا
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

  -- (ج) الأدمن رفض: pending_review → open
  --
  -- ⚠️ الفرق عن إلغاء العضو لنفسه (cancelSubmission) *مش* "هل
  -- last_rejection_note موجود؟" — لأنه لو سُلّمت التاسك أكتر من مرة،
  -- العمود بيضل فيه قيمة من رفض سابق حتى بعد ما العضو يسحب تسليم جديد
  -- (submitTask/cancelSubmission ما بيلمسوا هاد العمود إطلاقًا).
  --
  -- الفحص الصح: هل القيمة *تغيّرت فعليًا* بهاي الـ UPDATE بالذات.
  -- rejectTask دايمًا بيكتب سبب جديد بنفس الـ UPDATE يلي بيغيّر الـ
  -- status. cancelSubmission ما بيغيّره أبدًا، فـ OLD = NEW بالضبط.
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

-- منفصل تمامًا عن trg_tasks_notify (INSERT) — صفر خطر على شي شغال
create trigger trg_tasks_notify_review
  after update of status on public.tasks
  for each row execute function public.trg_notify_task_review();