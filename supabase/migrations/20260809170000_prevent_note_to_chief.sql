-- supabase/migrations/20260809170000_prevent_note_to_chief.sql
--
-- محدش يقدر يكتب ملاحظة مدير للشيف أدمن كهدف — حتى الديفيلوبر. بالإضافة
-- لقاعدة منع الملاحظة الذاتية الموجودة أصلاً (مايجريشن 20260809150100).

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

  if public.is_chief(new.member_id) then
    raise exception 'Cannot write a director note to the Chief Admin';
  end if;

  return new;
end;
$$;