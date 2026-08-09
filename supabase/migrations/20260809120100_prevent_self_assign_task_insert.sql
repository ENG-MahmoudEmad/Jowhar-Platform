-- supabase/migrations/20260809120100_prevent_self_assign_task_insert.sql
--
-- guard_task_self_update بتشتغل BEFORE UPDATE بس (بتقارن NEW مع OLD، مش
-- منطقية وقت INSERT أصلاً). قاعدة "بس الشيف أدمن يكلّف نفسه" لازم تتفحص
-- وقت الإنشاء (INSERT) — trigger منفصل هون، دفاع طبقة تانية فوق الفحص
-- الموجود أصلاً بـ createTask (tasksActions.ts).

create or replace function public.guard_task_no_self_assign_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to = new.created_by and not public.is_chief(new.created_by) then
    raise exception 'Only the Chief Admin can assign a task to themselves';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tasks_no_self_assign on public.tasks;

create trigger trg_tasks_no_self_assign
  before insert on public.tasks
  for each row
  execute function public.guard_task_no_self_assign_on_insert();