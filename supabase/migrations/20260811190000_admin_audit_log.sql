-- =====================================================================
-- Migration: admin_audit_log — سجل الأفعال الإدارية الحساسة
--
-- نطاق مقصود وضيق: بس الأفعال اللي لو صار نزاع أو خطأ، بدنا نعرف
-- مين عملها وإمتى وليش. مش كل تعديل بالمنصة (هيك بيضل الجدول قابل
-- للقراءة والمراجعة، مش سجل ضخم بلا فايدة).
--
-- actor_id: مين نفّذ الفعل. target_id: على مين (null لو مش منطبق).
-- action: نص ثابت من مجموعة معروفة (enum-like بالتطبيق، مش constraint
-- صارم بالداتابيز — نفس فلسفة news_posts.type، سهل نضيف نوع جديد بلا
-- ميغريشن). details: أي سياق إضافي (سبب، قيمة قديمة/جديدة) كـ jsonb.
-- =====================================================================

create table public.admin_audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid not null references public.profiles(id),
  target_id  uuid references public.profiles(id),
  action     text not null,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_log_actor      on public.admin_audit_log(actor_id);
create index idx_audit_log_target     on public.admin_audit_log(target_id);
create index idx_audit_log_created_at on public.admin_audit_log(created_at desc);

alter table public.admin_audit_log enable row level security;

-- القراءة: Chief/Developer فقط — نفس نطاق من يقدر يشوف Admin Control
create policy "chief_developer can read audit log"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_chief(auth.uid()) or public.is_developer(auth.uid()));

-- الكتابة: عبر الـ RPC أدناه فقط (SECURITY DEFINER) — ما في insert
-- مباشر مسموح، عشان محدا يقدر يزوّر سجل أو يمسحه.
-- (ما في policy لـ insert/update/delete = ممنوعين افتراضيًا لأي دور)

-- ---------------------------------------------------------------------
-- RPC: log_admin_action — نقطة تسجيل واحدة، بتاخد actor من auth.uid()
-- نفسها (مش من بارامتر) عشان محدا يقدر يسجّل باسم حدا تاني.
-- ---------------------------------------------------------------------
create or replace function public.log_admin_action(
  p_target_id uuid,
  p_action    text,
  p_details   jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  insert into public.admin_audit_log (actor_id, target_id, action, details)
  values (auth.uid(), p_target_id, p_action, p_details);
end;
$$;

grant execute on function public.log_admin_action(uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- تجربة بعد التشغيل:
--   select * from log_admin_action('00000000-0000-0000-0000-000000000000'::uuid, 'test', '{}');
--   -- بيرمي unauthenticated لو جربتها بالـ SQL Editor (طبيعي، ما في auth.uid() هناك)
--
--   select * from admin_audit_log order by created_at desc limit 10;
-- ---------------------------------------------------------------------