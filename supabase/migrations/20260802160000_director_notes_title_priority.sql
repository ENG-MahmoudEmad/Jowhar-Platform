-- =====================================================================
-- Migration 010: عنوان + أولوية + إيصال قراءة لملاحظات المدير
--
-- سبب التعديل: كارد الأدمن كان بيكتب نص فقط، بينما كارد العضو مصمّم على
-- عنوان + أولوية + إيصال قراءة. رقّينا جهة الأدمن بدل ما ننزّل جهة العضو،
-- عشان المدير يقدر يقول "هاي عاجلة" — وهي معلومة مفيدة فعلاً.
--
-- اللون مش عمود: بيُشتق من الأولوية بالواجهة، فما في منتقي ألوان يختاره
-- المدير ولا لون بيتناقض مع الأولوية.
-- =====================================================================

-- الأولوية بنفس قيم التاسكات (low/medium/high) — نفس الـ enum مقصودًا،
-- عشان الأولوية تعني الشي نفسه بكل المنصة.
alter table public.director_notes
  add column title text not null default ''
    check (char_length(title) <= 120),
  add column priority public.task_priority not null default 'medium',
  -- ⚠️ غير `member_last_seen_at`:
  --   member_last_seen_at → بتتحدث كل فتح، بتخدم عدّاد "في ردود جديدة"
  --   member_read_at      → أول قراءة فقط، بتُعرض للمدير كـ"قرأها إمتى"
  add column member_read_at timestamptz;

-- الملاحظات القديمة بلا عنوان — أول 60 حرف من نصها كعنوان مؤقت
update public.director_notes
   set title = left(btrim(text), 60)
 where btrim(title) = '';

-- بعد التعبئة نفرض وجود عنوان فعلي
alter table public.director_notes
  alter column title drop default;

alter table public.director_notes
  add constraint director_notes_title_not_blank
  check (char_length(btrim(title)) between 1 and 120);

-- ---------------------------------------------------------------------
-- إيصال القراءة نهائي — أول قراءة بتثبت ولا بتنكتب فوقها
-- ---------------------------------------------------------------------
create or replace function public.freeze_member_read_at()
returns trigger
language plpgsql
as $$
begin
  if old.member_read_at is not null then
    new.member_read_at = old.member_read_at;
  end if;
  return new;
end;
$$;

create trigger trg_director_notes_freeze_read_at
  before update on public.director_notes
  for each row execute function public.freeze_member_read_at();

-- ---------------------------------------------------------------------
-- تحديث RPC القراءة ليكتب الإيصال كمان
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
           -- الـ trigger بيمنع الكتابة فوق قيمة موجودة، فهاي بتثبت أول مرة بس
           member_read_at = coalesce(member_read_at, now())
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

-- العضو بيحتاج يكتب الإيصال كمان (الـ GRANT بمايجريشن 006 كان على عمودين بس)
grant update (director_last_seen_at, member_last_seen_at, member_read_at)
  on public.director_notes to authenticated;