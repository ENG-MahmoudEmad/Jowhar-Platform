-- supabase/migrations/20260809120000_chief_bypass_task_guard.sql
--
-- المشكلة: guard_task_self_update بمسار الأدمن بيتحقق عبر can_manage_member،
-- وهاي بترفض دايمًا لو actor.id = target.id (محدش بيدير نفسه — قاعدة عامة
-- صحيحة لباقي النظام). بس الشيف أدمن حسب القرار المحسوم بيقدر يعمل كل اشي
-- حتى مراجعة تاسك موكّلة لحاله شخصيًا (هو الوحيد المسموحله يكلّف نفسه
-- تاسكات أصلاً).
--
-- الحل: إضافة تخطي صريح لـ is_chief() على مستوى هالـ trigger تحديدًا (جدول
-- tasks بس) — بدون ما نلمس can_manage_member نفسها (مستخدمة بأماكن تانية
-- كتير، تعديلها كان يأثر على كل شي مش بس التاسكات).

create or replace function public.guard_task_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- الشيف أدمن: تخطي كامل، بما فيه تاسكات موكّلة لحاله شخصيًا
  if public.is_chief(auth.uid()) then
    return new;
  end if;

  -- مسار الأدمن: نفس الصلاحية القديمة، بيقدر يعدّل أي شي إلا لو عم يدير نفسه
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