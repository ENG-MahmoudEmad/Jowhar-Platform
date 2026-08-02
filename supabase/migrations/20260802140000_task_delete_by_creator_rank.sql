-- =====================================================================
-- Migration 008: حذف التاسك مرتبط بمين ضافها، مش بمين مكلّف فيها
--
-- السياسة القديمة كانت بتسأل: "هل تقدر تدير العضو المكلّف؟"
-- فأي أدمن كان يقدر يحذف تاسك ضافها الـ Chief أو الـ Developer لنفس العضو.
--
-- الجديدة بتسأل الاتنين:
--   1. هل تقدر تدير العضو المكلّف؟   (نفس القيد القديم)
--   2. هل تقدر تدير اللي ضاف التاسك؟ (القيد الجديد)
--
-- النتيجة بحسب can_manage_member:
--   Chief/Developer ضافها  →  الأدمن الثانوي ما بيحذفها
--   أدمن ضافها             →  Chief و Developer يحذفوها
--   إنت ضفتها              →  دايمًا تقدر تحذفها
-- =====================================================================

drop policy if exists tasks_delete_managed on public.tasks;

create policy tasks_delete_managed on public.tasks
  for delete to authenticated
  using (
    public.has_admin_capability('admin.add_task')
    and (assigned_to = auth.uid() or public.can_manage_member(auth.uid(), assigned_to))
    and (
      created_by = auth.uid()                                  -- تاسكاتك دايمًا إلك
      or created_by is null                                    -- حساب الكاتب انحذف
      or public.can_manage_member(auth.uid(), created_by)      -- أو أعلى منه رتبة
    )
  );