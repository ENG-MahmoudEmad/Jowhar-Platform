-- supabase/migrations/20260808190300_update_task_status_guard.sql
--
-- تحديث guard_task_self_update:
-- الدالة القديمة كانت بتسمح للعضو (غير الأدمن) يبدّل status لأي قيمة
-- (كان فيها ثغرة نظرية: عضو يقدر يحط status = 'done' مباشرة بنفسه).
--
-- الجديد: العضو (لما مش أدمن بصلاحية إدارة التاسكات) يقدر بس:
--   open → pending_review   (تسليم)
--   pending_review → open   (تراجع عن تسليم)
-- أي نقل تاني لل status (وأهمه: أي طريق لـ 'done') ممنوع من غير أدمن —
-- الموافقة/الرفض حصرًا عبر Server Action بصلاحية أدمن (guard admin path تحت).
--
-- كمان منعنا العضو من تعديل last_rejection_note مباشرة (حقل الأدمن بس).

create or replace function public.guard_task_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- مسار الأدمن: نفس الصلاحية القديمة بدون تغيير، بيقدر يعدّل أي شي
  -- (يشمل الموافقة/الرفض عبر الـ Server Action)
  if public.has_admin_capability('admin.add_task')
     and public.can_manage_member(auth.uid(), new.assigned_to) then
    return new;
  end if;

  -- مسار العضو صاحب التاسك: نفس القيود القديمة على الحقول الوصفية
  if new.assigned_to <> old.assigned_to
     or new.title       is distinct from old.title
     or new.description is distinct from old.description
     or new.start_date  is distinct from old.start_date
     or new.end_date    is distinct from old.end_date
     or new.priority    is distinct from old.priority
     or new.created_by  is distinct from old.created_by then
    raise exception 'Only status/submission fields can be changed on a task assigned to you';
  end if;

  -- العضو ما بيقدر يلمس سبب الرفض (حقل الأدمن)
  if new.last_rejection_note is distinct from old.last_rejection_note then
    raise exception 'Only an admin can set the rejection note';
  end if;

  -- تقييد انتقالات status المسموحة للعضو نفسه
  if new.status is distinct from old.status then
    if not (
      (old.status = 'open' and new.status = 'pending_review')
      or
      (old.status = 'pending_review' and new.status = 'open')
    ) then
      raise exception 'Members can only submit (open→pending_review) or cancel a submission (pending_review→open)';
    end if;
  end if;

  return new;
end;
$$;