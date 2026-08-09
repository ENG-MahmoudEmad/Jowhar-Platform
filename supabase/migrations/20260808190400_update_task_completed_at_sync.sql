-- supabase/migrations/20260808190400_update_task_completed_at_sync.sql
--
-- تحديث sync_task_completed_at عشان يدعم دورة الحياة الجديدة:
--   open → pending_review   : submitted_at = now()
--   pending_review → done   : completed_at = submitted_at (وقت التسليم، مش وقت
--                              موافقة الأدمن — قرار مقصود لتفادي ظلم تأخر الأدمن
--                              بالمراجعة على نقاط Leaderboard)
--   → open (إلغاء من العضو أو رفض من الأدمن): تصفير completed_at/submitted_at/
--                              submitted_note بالكامل — استعدادًا لمحاولة تسليم جديدة
--
-- + لما last_rejection_note تتغيّر لقيمة جديدة (رفض جديد) → rejection_seen_at
--   ترجع NULL تلقائيًا، عشان البادج التحذيري يطلع من جديد بـToday Focus.

create or replace function public.sync_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status = 'pending_review' then
      new.submitted_at = now();
    elsif new.status = 'done' then
      new.completed_at = coalesce(new.submitted_at, now());
    elsif new.status = 'open' then
      new.completed_at = null;
      new.submitted_at = null;
      new.submitted_note = null;
    end if;
  end if;

  if tg_op = 'UPDATE'
     and new.last_rejection_note is distinct from old.last_rejection_note
     and new.last_rejection_note is not null then
    new.rejection_seen_at = null;
  end if;

  return new;
end;
$$;