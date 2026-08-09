-- supabase/migrations/20260809150100_prevent_self_note_insert.sql
--
-- بعكس التاسكات (فيها استثناء للشيف أدمن)، الملاحظات ممنوعة على النفس
-- بشكل مطلق — محدش، ولا حتى الشيف أدمن، يقدر يكتب ملاحظة لنفسه.

create or replace function public.guard_note_no_self_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.member_id = new.author_id then
    raise exception 'Cannot write a director note to yourself';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notes_no_self on public.director_notes;

create trigger trg_notes_no_self
  before insert on public.director_notes
  for each row
  execute function public.guard_note_no_self_insert();