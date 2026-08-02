-- =====================================================================
-- Migration 006: tasks + director_notes + note_replies
-- Shared foundation for: Admin Control (Add Task / Director Notes),
-- My Tasks, and Dashboard (Team Performance / Calendar / Deadline Ring).
--
-- Shapes follow the existing components:
--   AddTask.tsx        -> TaskFormValues
--   DirectorNotes.tsx  -> DirectorNote + NoteReply
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Helpers
-- ---------------------------------------------------------------------

-- Only active accounts can read team data at all.
create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.deleted_at is null
  );
$$;

-- Chief / Developer implicitly hold every permission key.
create or replace function public.has_admin_capability(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_chief(auth.uid())
      or public.is_developer(auth.uid())
      or public.has_permission(auth.uid(), p_key);
$$;

-- Dedicated updated_at toucher (named so it can't clobber an existing one).
create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------

create type public.task_priority   as enum ('low', 'medium', 'high');
-- 'due' is NOT stored: it is derived in the UI from (status = 'open' AND end_date < today).
create type public.task_status     as enum ('open', 'done');
create type public.note_author_role as enum ('director', 'member');

-- ---------------------------------------------------------------------
-- 2. tasks
-- ---------------------------------------------------------------------

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(btrim(title)) between 1 and 120),
  description  text check (char_length(description) <= 2000),
  start_date   date not null,
  end_date     date not null,
  priority     public.task_priority not null default 'medium',
  status       public.task_status   not null default 'open',
  assigned_to  uuid not null references public.profiles(id) on delete cascade,
  created_by   uuid          references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint tasks_date_order check (end_date >= start_date)
);

-- Dashboard/Calendar/My Tasks read patterns.
create index tasks_assigned_to_idx        on public.tasks (assigned_to);
create index tasks_assigned_status_idx    on public.tasks (assigned_to, status);
create index tasks_end_date_idx           on public.tasks (end_date);
create index tasks_range_idx              on public.tasks (start_date, end_date);
create index tasks_created_by_idx         on public.tasks (created_by);

create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_row_updated_at();

-- completed_at is derived from status, never sent by the client.
create or replace function public.sync_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.completed_at = now();
  elsif new.status = 'open' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger trg_tasks_completed_at
  before insert or update on public.tasks
  for each row execute function public.sync_task_completed_at();

-- The assignee may flip status on their My Tasks page, but may not rewrite
-- the task the director gave them.
create or replace function public.guard_task_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.has_admin_capability('admin.add_task')
     and public.can_manage_member(auth.uid(), new.assigned_to) then
    return new;
  end if;

  if new.assigned_to <> old.assigned_to
     or new.title       is distinct from old.title
     or new.description is distinct from old.description
     or new.start_date  is distinct from old.start_date
     or new.end_date    is distinct from old.end_date
     or new.priority    is distinct from old.priority
     or new.created_by  is distinct from old.created_by then
    raise exception 'Only status can be changed on a task assigned to you';
  end if;

  return new;
end;
$$;

create trigger trg_tasks_guard_self_update
  before update on public.tasks
  for each row execute function public.guard_task_self_update();

-- ---------------------------------------------------------------------
-- 3. director_notes
-- ---------------------------------------------------------------------

create table public.director_notes (
  id                    uuid primary key default gen_random_uuid(),
  member_id             uuid not null references public.profiles(id) on delete cascade,
  author_id             uuid          references public.profiles(id) on delete set null,
  text                  text not null check (char_length(btrim(text)) between 1 and 2000),
  -- One timestamp per side instead of a read flag per reply: the UI only ever
  -- asks "is there something new here".
  director_last_seen_at timestamptz,
  member_last_seen_at   timestamptz,
  created_at            timestamptz not null default now()
);

create index director_notes_member_idx  on public.director_notes (member_id, created_at desc);
create index director_notes_author_idx  on public.director_notes (author_id);

-- ---------------------------------------------------------------------
-- 4. note_replies
-- ---------------------------------------------------------------------

create table public.note_replies (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references public.director_notes(id) on delete cascade,
  author_id   uuid          references public.profiles(id) on delete set null,
  author_role public.note_author_role not null,
  text        text not null check (char_length(btrim(text)) between 1 and 2000),
  created_at  timestamptz not null default now()
);

create index note_replies_note_idx on public.note_replies (note_id, created_at asc);

-- author_role is decided by the server, not the client: whoever is not the
-- note's member is a director. Keeps unread counting honest.
create or replace function public.set_reply_author_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid;
begin
  select member_id into v_member from public.director_notes where id = new.note_id;
  new.author_role = case when new.author_id = v_member then 'member' else 'director' end;
  return new;
end;
$$;

create trigger trg_note_replies_author_role
  before insert on public.note_replies
  for each row execute function public.set_reply_author_role();

-- ---------------------------------------------------------------------
-- 5. mark-as-seen RPC (writes the correct side's column)
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
       set member_last_seen_at = now()
     where id = p_note_id;
  elsif public.has_admin_capability('admin.director_notes')
        and public.can_manage_member(auth.uid(), v_member) then
    update public.director_notes
       set director_last_seen_at = now()
     where id = p_note_id;
  else
    raise exception 'Not allowed';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------

alter table public.tasks           enable row level security;
alter table public.director_notes  enable row level security;
alter table public.note_replies    enable row level security;

-- ---- tasks ----
-- Team Performance, Calendar and the Leaderboard all read other members'
-- tasks, so SELECT is team-wide for active accounts.
create policy tasks_select_team on public.tasks
  for select to authenticated
  using (public.is_active_member());

create policy tasks_insert_managed on public.tasks
  for insert to authenticated
  with check (
    public.has_admin_capability('admin.add_task')
    and (assigned_to = auth.uid() or public.can_manage_member(auth.uid(), assigned_to))
  );

-- The assignee is allowed through here; the guard trigger above limits them
-- to the status column.
create policy tasks_update on public.tasks
  for update to authenticated
  using (
    assigned_to = auth.uid()
    or (public.has_admin_capability('admin.add_task') and public.can_manage_member(auth.uid(), assigned_to))
  )
  with check (
    assigned_to = auth.uid()
    or (public.has_admin_capability('admin.add_task') and public.can_manage_member(auth.uid(), assigned_to))
  );

create policy tasks_delete_managed on public.tasks
  for delete to authenticated
  using (
    public.has_admin_capability('admin.add_task')
    and (assigned_to = auth.uid() or public.can_manage_member(auth.uid(), assigned_to))
  );

-- ---- director_notes ----
create policy director_notes_select on public.director_notes
  for select to authenticated
  using (
    member_id = auth.uid()
    or author_id = auth.uid()
    or (public.has_admin_capability('admin.director_notes') and public.can_manage_member(auth.uid(), member_id))
  );

create policy director_notes_insert on public.director_notes
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.has_admin_capability('admin.director_notes')
    and (member_id = auth.uid() or public.can_manage_member(auth.uid(), member_id))
  );

-- Notes are immutable (no edit in the UI) — updates go through mark_note_seen only.
create policy director_notes_delete on public.director_notes
  for delete to authenticated
  using (
    author_id = auth.uid()
    or (public.has_admin_capability('admin.director_notes') and public.can_manage_member(auth.uid(), member_id))
  );

-- ---- note_replies ----
create policy note_replies_select on public.note_replies
  for select to authenticated
  using (
    exists (
      select 1 from public.director_notes n
      where n.id = note_replies.note_id
        and (
          n.member_id = auth.uid()
          or n.author_id = auth.uid()
          or (public.has_admin_capability('admin.director_notes') and public.can_manage_member(auth.uid(), n.member_id))
        )
    )
  );

create policy note_replies_insert on public.note_replies
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.director_notes n
      where n.id = note_replies.note_id
        and (
          n.member_id = auth.uid()
          or (public.has_admin_capability('admin.director_notes') and public.can_manage_member(auth.uid(), n.member_id))
        )
    )
  );

create policy note_replies_delete on public.note_replies
  for delete to authenticated
  using (author_id = auth.uid());

-- ---------------------------------------------------------------------
-- 7. GRANTs  (lesson #1: db push does not grant automatically)
-- ---------------------------------------------------------------------

grant select, insert, update, delete on public.tasks          to authenticated;
grant select, insert, delete          on public.director_notes to authenticated;
grant update (director_last_seen_at, member_last_seen_at)
                                      on public.director_notes to authenticated;
grant select, insert, delete          on public.note_replies   to authenticated;

grant execute on function public.is_active_member()            to authenticated;
grant execute on function public.has_admin_capability(text)    to authenticated;
grant execute on function public.mark_note_seen(uuid)          to authenticated;