-- supabase/migrations/20260809160000_get_admin_member_badges.sql
--
-- بادج رقمي لكل عضو بقائمة Admin Control: مجموع (تاسكات قيد المراجعة اللي
-- الأدمن الحالي يقدر يراجعها + ملاحظات مدير فيها رد عضو جديد ما شافه الأدمن
-- بعد). الفحص كله من منظور auth.uid() الحالي — نفس قواعد assertCanReview
-- بالضبط (created_by = actor أو is_chief)، فما بيطلع رقم لتاسك ما بيقدر
-- يراجعها أصلاً.

create or replace function public.get_admin_member_badges()
returns table (member_id uuid, badge_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select combined.member_id, sum(combined.cnt)::int as badge_count
  from (
    -- تاسكات قيد المراجعة اللي الأدمن الحالي يقدر يوافق/يرفض عليها
    select assigned_to as member_id, count(*) as cnt
    from public.tasks
    where status = 'pending_review'
      and (created_by = auth.uid() or public.is_chief(auth.uid()))
    group by assigned_to

    union all

    -- ملاحظات مدير فيها رد من العضو بعد آخر مرة شافها أي أدمن
    select n.member_id, count(*) as cnt
    from public.director_notes n
    where exists (
      select 1 from public.note_replies r
      where r.note_id = n.id
        and r.author_role = 'member'
        and (n.director_last_seen_at is null or r.created_at > n.director_last_seen_at)
    )
    group by n.member_id
  ) combined
  group by combined.member_id;
$$;