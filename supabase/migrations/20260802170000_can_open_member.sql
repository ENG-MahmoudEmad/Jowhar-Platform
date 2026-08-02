-- =====================================================================
-- Migration 011: فصل "الفتح" عن "الإدارة"
--
-- الغلط: سياسات التاسكات والملاحظات كانت مبنية على can_manage_member،
-- وهي بترجع false لأي هدف Chief. فالنتيجة إن الـ Developer ما كان يقدر
-- يضيف تاسك أو ملاحظة للـ Chief — بينما القاعدة المقصودة إنه يقدر.
--
-- الفرق (مطابق لـ hierarchy.ts بالحرف):
--   can_manage_member → إيقاف، تغيير أدوار، منح صلاحيات.
--                       الـ Chief والـ Developer محميين منها تمامًا.
--   can_open_member   → إضافة تاسك أو ملاحظة. أوسع:
--                         • كل واحد يقدر يفتح صفه
--                         • Chief و Developer يفتحوا أي حد — بما فيهم بعض
--                         • الأدمن الثانوي: الأعضاء العاديين بس
--
-- إضافة تاسكة أو ملاحظة مش تدخّل بالصلاحيات، فما في سبب تمنعها.
-- =====================================================================

create or replace function public.can_open_member(actor uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select
    actor = target                                   -- كل واحد يفتح صفه
    or public.is_developer(actor)                    -- الـ Developer يفتح أي حد
    or public.is_chief(actor)                        -- والـ Chief كمان
    or (
      public.is_admin(actor)
      and not public.is_chief(target)                -- الأدمن الثانوي: members بس
      and not public.is_developer(target)
      and exists (
        select 1 from public.profiles
        where id = target and access_role = 'member'
      )
    );
$function$;

grant execute on function public.can_open_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- tasks — الإضافة والتعديل والحذف بتتحول لـ can_open_member
-- (السماح بالنفس صار داخل الدالة، فما عاد في داعي لشرط assigned_to = auth.uid())
-- ---------------------------------------------------------------------

drop policy if exists tasks_insert_managed on public.tasks;
create policy tasks_insert_managed on public.tasks
  for insert to authenticated
  with check (
    public.has_admin_capability('admin.add_task')
    and public.can_open_member(auth.uid(), assigned_to)
  );

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update to authenticated
  using (
    assigned_to = auth.uid()
    or (public.has_admin_capability('admin.add_task') and public.can_open_member(auth.uid(), assigned_to))
  )
  with check (
    assigned_to = auth.uid()
    or (public.has_admin_capability('admin.add_task') and public.can_open_member(auth.uid(), assigned_to))
  );

/*
  الحذف بيضل مرتبط برتبة اللي ضاف التاسك (مايجريشن 008):
  تقدر تفتح الـ Chief وتضيفله تاسك، بس ما تقدر تمسح تاسك هو ضافها.
  فالشرط الأول بيصير can_open (مين تقدر تضيفله)، والتاني بيضل
  can_manage (مين تقدر تلغي شغله).
*/
drop policy if exists tasks_delete_managed on public.tasks;
create policy tasks_delete_managed on public.tasks
  for delete to authenticated
  using (
    public.has_admin_capability('admin.add_task')
    and public.can_open_member(auth.uid(), assigned_to)
    and (
      created_by = auth.uid()
      or created_by is null
      or public.can_manage_member(auth.uid(), created_by)
    )
  );

-- ---------------------------------------------------------------------
-- director_notes
-- ---------------------------------------------------------------------

drop policy if exists director_notes_select on public.director_notes;
create policy director_notes_select on public.director_notes
  for select to authenticated
  using (
    member_id = auth.uid()
    or author_id = auth.uid()
    or (public.has_admin_capability('admin.director_notes') and public.can_open_member(auth.uid(), member_id))
  );

drop policy if exists director_notes_insert on public.director_notes;
create policy director_notes_insert on public.director_notes
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.has_admin_capability('admin.director_notes')
    and public.can_open_member(auth.uid(), member_id)
  );

-- الحذف: كاتبها، أو مين أعلى رتبة من صاحب الملاحظة
drop policy if exists director_notes_delete on public.director_notes;
create policy director_notes_delete on public.director_notes
  for delete to authenticated
  using (
    author_id = auth.uid()
    or (public.has_admin_capability('admin.director_notes') and public.can_manage_member(auth.uid(), member_id))
  );

-- ---------------------------------------------------------------------
-- note_replies
-- ---------------------------------------------------------------------

drop policy if exists note_replies_select on public.note_replies;
create policy note_replies_select on public.note_replies
  for select to authenticated
  using (
    exists (
      select 1 from public.director_notes n
      where n.id = note_replies.note_id
        and (
          n.member_id = auth.uid()
          or n.author_id = auth.uid()
          or (public.has_admin_capability('admin.director_notes') and public.can_open_member(auth.uid(), n.member_id))
        )
    )
  );

drop policy if exists note_replies_insert on public.note_replies;
create policy note_replies_insert on public.note_replies
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.director_notes n
      where n.id = note_replies.note_id
        and (
          n.member_id = auth.uid()
          or (public.has_admin_capability('admin.director_notes') and public.can_open_member(auth.uid(), n.member_id))
        )
    )
  );

-- ---------------------------------------------------------------------
-- mark_note_seen — نفس التصحيح
-- ---------------------------------------------------------------------

create or replace function public.mark_note_seen(p_note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid;
begin
  select member_id into v_member from public.director_notes where id = p_note_id;
  if v_member is null then
    raise exception 'Note not found';
  end if;

  if v_member = auth.uid() then
    update public.director_notes
       set member_last_seen_at = now(),
           member_read_at = coalesce(member_read_at, now())
     where id = p_note_id;
  elsif public.has_admin_capability('admin.director_notes')
        and public.can_open_member(auth.uid(), v_member) then
    update public.director_notes
       set director_last_seen_at = now()
     where id = p_note_id;
  else
    raise exception 'Not allowed';
  end if;
end;
$$;