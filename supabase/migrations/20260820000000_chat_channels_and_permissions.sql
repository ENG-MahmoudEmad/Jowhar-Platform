-- ============================================================
-- Chat Feature — Migration 1/N
-- القنوات + العضوية + كاتالوج صلاحيات المشرفين
-- بنفس نمط permissions/user_permissions الموجود بالمشروع
-- ============================================================

-- ------------------------------------------------------------
-- 1) chat_channels — القنوات (المجموعات)
-- ------------------------------------------------------------
create table public.chat_channels (
  id                uuid primary key default gen_random_uuid(),
  name_en           text not null,
  name_ar           text not null,
  description_en    text,
  description_ar    text,

  -- إنشاء القناة حصري بالشيف أدمن/الديفيلوبر (يُفرض بالـ RLS + Server Action)
  created_by        uuid not null references public.profiles(id),

  -- إغلاق/إخفاء القناة (بدون فقدان عضوية أو تاريخ)
  is_archived       boolean not null default false,
  archived_at       timestamp with time zone,
  archived_by       uuid references public.profiles(id),

  -- إعداد الحذف التلقائي للأرشيف (نافذة بحدود ثابتة)
  retention_months  smallint not null default 6
                     check (retention_months in (1, 3, 6, 12)),

  -- Slow mode: عدد الثواني بين رسالة والتانية لنفس العضو، 0 = معطّل
  slow_mode_seconds integer not null default 0,

  created_at        timestamp with time zone not null default now(),
  updated_at        timestamp with time zone not null default now()
);

comment on table public.chat_channels is
  'قنوات/مجموعات الشات. الإنشاء حصري بالشيف أدمن والديفيلوبر.';

create trigger trg_chat_channels_updated_at
  before update on public.chat_channels
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 2) chat_channel_members — عضوية كل قناة
-- ------------------------------------------------------------
create table public.chat_channel_members (
  channel_id  uuid not null references public.chat_channels(id) on delete cascade,
  member_id   uuid not null references public.profiles(id) on delete cascade,

  added_by    uuid not null references public.profiles(id),
  added_at    timestamp with time zone not null default now(),

  -- Mute شخصي — بس صاحب العضوية يتحكم فيه لحاله
  is_muted    boolean not null default false,
  muted_at    timestamp with time zone,

  primary key (channel_id, member_id)
);

comment on table public.chat_channel_members is
  'عضوية القنوات. لو العضو مو هون، القناة ما تظهر عنده إطلاقاً (يُفرض بالـ RLS).';

create index idx_chat_channel_members_member on public.chat_channel_members(member_id);


-- ------------------------------------------------------------
-- 3) chat_permissions — كاتالوج صلاحيات الشات
--    (نفس نمط جدول permissions العام، بس مستقل تماماً وخاص بالشات)
-- ------------------------------------------------------------
create table public.chat_permissions (
  key         text primary key,
  label_en    text not null,
  label_ar    text not null,
  category    text not null default 'moderation'
);

comment on table public.chat_permissions is
  'كاتالوج صلاحيات إشراف القنوات. مستقل عن جدول permissions العام لصلاحيات المنصة.';

insert into public.chat_permissions (key, label_en, label_ar, category) values
  ('chat.pin_messages',            'Pin Messages',              'تثبيت الرسائل',              'moderation'),
  ('chat.delete_others_messages',  'Delete Others'' Messages',   'حذف رسائل الأعضاء',          'moderation'),
  ('chat.mute_members',            'Mute Members',               'كتم الأعضاء',                'moderation'),
  ('chat.restrict_members',        'Restrict Members',           'تقييد الكتابة/الإيموجي',     'moderation'),
  ('chat.manage_slow_mode',        'Manage Slow Mode',           'إدارة الوضع البطيء',         'moderation');

-- ملاحظة مهمة: صلاحيتي /clear والرسائل الصوتية عمداً مش هون —
-- هاتين حصريتين بالشيف أدمن/الديفيلوبر عبر تحقق مباشر من profiles،
-- وغير قابلتين للتفويض عبر هالكاتالوج إطلاقاً.


-- ------------------------------------------------------------
-- 4) chat_channel_moderators — ربط: مين مشرف على أي قناة، وبأي صلاحيات
-- ------------------------------------------------------------
create table public.chat_channel_moderators (
  channel_id      uuid not null references public.chat_channels(id) on delete cascade,
  member_id       uuid not null references public.profiles(id) on delete cascade,
  permission_key  text not null references public.chat_permissions(key),

  granted_by      uuid not null references public.profiles(id),
  granted_at      timestamp with time zone not null default now(),

  primary key (channel_id, member_id, permission_key)
);

comment on table public.chat_channel_moderators is
  'صلاحيات إشراف مخصصة لكل عضو بكل قناة. يمنحها الشيف أدمن/الديفيلوبر فقط.';


-- ------------------------------------------------------------
-- 5) chat_member_restrictions — منع كتابة / تقييد إيموجي / إذن صوتيات
-- ------------------------------------------------------------
create table public.chat_member_restrictions (
  channel_id        uuid not null references public.chat_channels(id) on delete cascade,
  member_id         uuid not null references public.profiles(id) on delete cascade,

  can_send_messages boolean not null default true,
  allowed_emojis    text[],              -- null = كل الإيموجي مسموحة، array فاضي = ممنوع كلياً
  can_send_voice    boolean not null default false,  -- حصراً يمنحها Chief/Developer

  updated_by        uuid not null references public.profiles(id),
  updated_at        timestamp with time zone not null default now(),

  primary key (channel_id, member_id)
);

comment on table public.chat_member_restrictions is
  'تقييدات فردية بكل قناة. can_send_voice يُمنح حصراً من الشيف أدمن/الديفيلوبر (يُفرض بالـ RLS + trigger).';

create trigger trg_chat_member_restrictions_updated_at
  before update on public.chat_member_restrictions
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 6) دوال الصلاحيات الأساسية (بنفس نمط is_chief / has_permission)
-- ------------------------------------------------------------

-- إنشاء/أرشفة قنوات + كل الصلاحيات الحرجة (/clear، منح الصوتيات):
-- حصراً Chief أو Developer، بدون أي تفويض ممكن.
create or replace function public.is_chat_super_admin(uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select public.is_chief(uid) or public.is_developer(uid);
$$;

comment on function public.is_chat_super_admin is
  'المرجع الوحيد لصلاحيات الشات الحرجة (/clear، منح إذن الصوتيات، إنشاء/أرشفة القنوات). لا تفويض ممكن.';

-- هل عند العضو صلاحية إشراف معينة بقناة معينة (مباشرة، أو لأنه Chief/Developer)
create or replace function public.has_chat_permission(uid uuid, p_channel_id uuid, p_key text)
returns boolean
language sql
security definer
stable
as $$
  select
    public.is_chat_super_admin(uid)
    or exists (
      select 1 from public.chat_channel_moderators
      where channel_id = p_channel_id
        and member_id = uid
        and permission_key = p_key
    );
$$;

-- هل العضو أصلاً عضو بهاي القناة (ومو مؤرشفة، إلا لو Chief/Developer)
create or replace function public.is_chat_channel_member(uid uuid, p_channel_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select
    public.is_chat_super_admin(uid)
    or exists (
      select 1 from public.chat_channel_members ccm
      join public.chat_channels cc on cc.id = ccm.channel_id
      where ccm.channel_id = p_channel_id
        and ccm.member_id = uid
        and cc.is_archived = false
    );
$$;


-- ------------------------------------------------------------
-- 7) RLS Policies
-- ------------------------------------------------------------
-- rls_auto_enable (event trigger) بيفعّل RLS تلقائياً على كل جدول جديد.
-- هون منضيف الـ policies بس.

-- chat_channels: تظهر بس للأعضاء المضافين فيها (أو Chief/Developer)
create policy chat_channels_select on public.chat_channels
  for select using (public.is_chat_channel_member(auth.uid(), id));

create policy chat_channels_insert on public.chat_channels
  for insert with check (public.is_chat_super_admin(auth.uid()));

create policy chat_channels_update on public.chat_channels
  for update using (public.is_chat_super_admin(auth.uid()));

-- chat_channel_members: يشوف عضويته وعضويات نفس قنواته
create policy chat_channel_members_select on public.chat_channel_members
  for select using (public.is_chat_channel_member(auth.uid(), channel_id));

create policy chat_channel_members_insert on public.chat_channel_members
  for insert with check (public.is_chat_super_admin(auth.uid()));

create policy chat_channel_members_delete on public.chat_channel_members
  for delete using (public.is_chat_super_admin(auth.uid()));

-- العضو نفسه يقدر يعدّل mute تبعه بس (عمود واحد، عبر Server Action مخصص أدق من RLS عام)
create policy chat_channel_members_update_self_mute on public.chat_channel_members
  for update using (member_id = auth.uid())
  with check (member_id = auth.uid());

-- chat_permissions: كاتالوج للقراءة العامة لأي عضو نشط (يحتاجه UI منح الصلاحيات)
create policy chat_permissions_select on public.chat_permissions
  for select using (public.is_active_user(auth.uid()));

-- chat_channel_moderators: يشوفها أعضاء القناة، يعدّلها Chief/Developer فقط
create policy chat_channel_moderators_select on public.chat_channel_moderators
  for select using (public.is_chat_channel_member(auth.uid(), channel_id));

create policy chat_channel_moderators_insert on public.chat_channel_moderators
  for insert with check (public.is_chat_super_admin(auth.uid()));

create policy chat_channel_moderators_delete on public.chat_channel_moderators
  for delete using (public.is_chat_super_admin(auth.uid()));

-- chat_member_restrictions: يشوفها أعضاء القناة
create policy chat_member_restrictions_select on public.chat_member_restrictions
  for select using (public.is_chat_channel_member(auth.uid(), channel_id));

-- التعديل: super admin دايماً، أو مشرف عنده صلاحية restrict_members
-- (باستثناء can_send_voice — هاد محمي بـ trigger تحت، مش هون)
create policy chat_member_restrictions_upsert on public.chat_member_restrictions
  for insert with check (
    public.is_chat_super_admin(auth.uid())
    or public.has_chat_permission(auth.uid(), channel_id, 'chat.restrict_members')
  );

create policy chat_member_restrictions_update on public.chat_member_restrictions
  for update using (
    public.is_chat_super_admin(auth.uid())
    or public.has_chat_permission(auth.uid(), channel_id, 'chat.restrict_members')
  );


-- ------------------------------------------------------------
-- 8) حماية can_send_voice — حصراً Chief/Developer، حتى لو المشرف
--    عنده صلاحية chat.restrict_members العامة
-- ------------------------------------------------------------
create or replace function public.guard_chat_voice_permission()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'UPDATE' and new.can_send_voice is distinct from old.can_send_voice)
     or (tg_op = 'INSERT' and new.can_send_voice = true) then
    if not public.is_chat_super_admin(auth.uid()) then
      raise exception 'إذن الرسائل الصوتية حصري بالشيف أدمن والديفيلوبر';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_guard_chat_voice_permission
  before insert or update on public.chat_member_restrictions
  for each row execute function public.guard_chat_voice_permission();