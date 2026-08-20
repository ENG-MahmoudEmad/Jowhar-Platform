-- supabase/migrations/20260820010000_chat_messages_and_notifications.sql

-- ============================================================
-- Chat Feature — Migration 2/N
-- الرسائل + القراءات + التفاعلات + إشعارات الشات + جدولة الحذف التلقائي
-- ============================================================

-- ------------------------------------------------------------
-- 1) chat_messages — الرسائل
-- ------------------------------------------------------------
create table public.chat_messages (
  id                    uuid primary key default gen_random_uuid(),
  channel_id            uuid not null references public.chat_channels(id) on delete cascade,
  sender_id             uuid not null references public.profiles(id),

  content               text,   -- ممكن تكون null لو الرسالة مرفق بس (صورة/صوت)

  -- رد على رسالة (لتلوينها بالأصفر بالواجهة)
  reply_to_message_id   uuid references public.chat_messages(id) on delete set null,

  -- Forward
  forwarded_from_message_id  uuid references public.chat_messages(id) on delete set null,
  forwarded_from_channel_id  uuid references public.chat_channels(id) on delete set null,
  forwarded_from_sender_id   uuid references public.profiles(id),

  -- تثبيت
  is_pinned             boolean not null default false,
  pinned_at             timestamp with time zone,
  pinned_by             uuid references public.profiles(id),

  -- Soft delete
  deleted_at            timestamp with time zone,
  deleted_by            uuid references public.profiles(id),

  -- تعديل
  edited_at             timestamp with time zone,

  -- مرفقات (معطّلة حالياً خلف feature flag بالواجهة — الأعمدة جاهزة فقط)
  attachment_url         text,
  attachment_type        text check (attachment_type in ('image', 'video', 'voice')),

  -- @everyone / @here
  mentions_everyone      boolean not null default false,
  mentions_here          boolean not null default false,

  created_at             timestamp with time zone not null default now()
);

comment on table public.chat_messages is
  'رسائل الشات. الحذف soft delete فقط. المرفقات جاهزة بالبنية ومعطّلة بالواجهة لحد شراء Supabase Pro.';

create index idx_chat_messages_channel_created on public.chat_messages(channel_id, created_at desc);
create index idx_chat_messages_channel_pinned on public.chat_messages(channel_id) where is_pinned = true;
create index idx_chat_messages_sender on public.chat_messages(sender_id);


-- ------------------------------------------------------------
-- 2) chat_message_reads — من قرأ كل رسالة ومتى
-- ------------------------------------------------------------
create table public.chat_message_reads (
  message_id  uuid not null references public.chat_messages(id) on delete cascade,
  member_id   uuid not null references public.profiles(id) on delete cascade,
  read_at     timestamp with time zone not null default now(),

  primary key (message_id, member_id)
);

comment on table public.chat_message_reads is
  'من قرأ كل رسالة ومتى — لعرض تفاصيل "شوهدت من" عند الضغط على الرسالة.';

create index idx_chat_message_reads_member on public.chat_message_reads(member_id);


-- ------------------------------------------------------------
-- 3) chat_message_reactions — الإيموجي
-- ------------------------------------------------------------
create table public.chat_message_reactions (
  message_id  uuid not null references public.chat_messages(id) on delete cascade,
  member_id   uuid not null references public.profiles(id) on delete cascade,
  emoji       text not null,
  created_at  timestamp with time zone not null default now(),

  primary key (message_id, member_id, emoji)
);

comment on table public.chat_message_reactions is
  'تفاعلات الإيموجي على الرسائل. التحقق من allowed_emojis (chat_member_restrictions) يصير بالـ Server Action.';

create index idx_chat_message_reactions_message on public.chat_message_reactions(message_id);


-- ------------------------------------------------------------
-- 4) enum + جدول إشعارات الشات (منفصل تماماً عن notifications العام)
-- ------------------------------------------------------------
create type public.chat_notification_type as enum (
  'mention',            -- منشن مباشر (@اسم)
  'mention_everyone',   -- @everyone
  'mention_here',       -- @here (بس للمتواجدين حالياً)
  'reply',              -- رد على رسالتك
  'added_to_channel',   -- تمت إضافتك لقناة
  'channel_archived',   -- قناة كنت فيها انقفلت
  'channel_unarchived', -- قناة انفتحت من جديد
  'deletion_warning'    -- تنبيه حذف تلقائي قادم خلال 10 أيام
);

create table public.chat_notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  type          public.chat_notification_type not null,

  actor_id      uuid references public.profiles(id),
  channel_id    uuid references public.chat_channels(id) on delete cascade,
  message_id    uuid references public.chat_messages(id) on delete cascade,

  subject       text not null default '',
  href          text not null,

  is_read       boolean not null default false,
  read_at       timestamp with time zone,

  created_at    timestamp with time zone not null default now()
);

comment on table public.chat_notifications is
  'إشعارات الشات فقط. مستقلة تماماً عن جدول notifications العام — لا علاقة لها بجرس الـ navbar الحالي.';

create index idx_chat_notifications_recipient on public.chat_notifications(recipient_id, is_read);


-- ------------------------------------------------------------
-- 5) جدولة الحذف التلقائي للأرشيف
-- ------------------------------------------------------------

-- إعداد عام (مرحلة أولى: إعداد واحد يطبّق على كل القنوات)
create table public.chat_retention_settings (
  id                  smallint primary key default 1 check (id = 1),  -- صف وحيد
  retention_months    smallint not null default 6
                       check (retention_months in (1, 3, 6, 12)),
  updated_by          uuid references public.profiles(id),
  updated_at          timestamp with time zone not null default now()
);

insert into public.chat_retention_settings (id, retention_months) values (1, 6);

comment on table public.chat_retention_settings is
  'إعداد مدة الأرشيف العام لكل القنوات. يعدّله الشيف أدمن/الديفيلوبر فقط. صف وحيد دائماً.';

create trigger trg_chat_retention_settings_updated_at
  before update on public.chat_retention_settings
  for each row execute function public.set_updated_at();

-- سجل عمليات الحذف التلقائي (تتبع + منع تكرار التنبيه لنفس النطاق الزمني)
create table public.chat_deletion_log (
  id                  uuid primary key default gen_random_uuid(),
  range_start         timestamp with time zone not null,
  range_end           timestamp with time zone not null,

  warning_sent_at     timestamp with time zone,   -- وقت إرسال تنبيه الـ10 أيام
  executed_at         timestamp with time zone,   -- وقت تنفيذ الحذف الفعلي
  messages_deleted    integer,

  created_at          timestamp with time zone not null default now()
);

comment on table public.chat_deletion_log is
  'سجل دورات الحذف التلقائي: متى انبعث التنبيه، ومتى انفّذ الحذف الفعلي، وعدد الرسائل.';


-- ------------------------------------------------------------
-- 6) RLS Policies
-- ------------------------------------------------------------

-- chat_messages: تُقرأ فقط من أعضاء نفس القناة
create policy chat_messages_select on public.chat_messages
  for select using (public.is_chat_channel_member(auth.uid(), channel_id));

-- الإرسال: لازم يكون عضو بالقناة + مو ممنوع من الكتابة
-- (فحص slow mode بالتفصيل يصير بالـ Server Action، هون فقط الحد الأدنى)
create policy chat_messages_insert on public.chat_messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_chat_channel_member(auth.uid(), channel_id)
    and not exists (
      select 1 from public.chat_member_restrictions r
      where r.channel_id = chat_messages.channel_id
        and r.member_id = auth.uid()
        and r.can_send_messages = false
    )
  );

-- تعديل رسالة: صاحبها بس (تعديل المحتوى أو soft-delete لنفسه)، أو مين
-- عنده صلاحية chat.delete_others_messages (بس لحذف رسائل الغير، مش تعديل
-- محتواها). الفصل الدقيق بين "تعديل محتوى" و"حذف بس" يُفرض بالـ Server
-- Action (تتحقق قبل الـ update إنه لو actor ≠ sender، الحقول المسموحة
-- تتغيّر هي deleted_at/deleted_by بس).
create policy chat_messages_update on public.chat_messages
  for update using (
    sender_id = auth.uid()
    or public.has_chat_permission(auth.uid(), channel_id, 'chat.delete_others_messages')
  );

-- chat_message_reads: يشوف قراءات رسائل قنواته بس
create policy chat_message_reads_select on public.chat_message_reads
  for select using (
    exists (
      select 1 from public.chat_messages m
      where m.id = message_id
        and public.is_chat_channel_member(auth.uid(), m.channel_id)
    )
  );

create policy chat_message_reads_insert on public.chat_message_reads
  for insert with check (member_id = auth.uid());

-- chat_message_reactions
create policy chat_message_reactions_select on public.chat_message_reactions
  for select using (
    exists (
      select 1 from public.chat_messages m
      where m.id = message_id
        and public.is_chat_channel_member(auth.uid(), m.channel_id)
    )
  );

create policy chat_message_reactions_insert on public.chat_message_reactions
  for insert with check (member_id = auth.uid());

create policy chat_message_reactions_delete on public.chat_message_reactions
  for delete using (member_id = auth.uid());

-- chat_notifications: كل واحد يشوف إشعاراته هو بس
create policy chat_notifications_select on public.chat_notifications
  for select using (recipient_id = auth.uid());

create policy chat_notifications_update on public.chat_notifications
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- chat_retention_settings: القراءة لأي عضو نشط، التعديل حصراً super admin
create policy chat_retention_settings_select on public.chat_retention_settings
  for select using (public.is_active_user(auth.uid()));

create policy chat_retention_settings_update on public.chat_retention_settings
  for update using (public.is_chat_super_admin(auth.uid()));

-- chat_deletion_log: قراءة فقط لـ super admin (سجل إداري)
create policy chat_deletion_log_select on public.chat_deletion_log
  for select using (public.is_chat_super_admin(auth.uid()));


-- ------------------------------------------------------------
-- 7) دالة إرسال إشعار شات (بنفس نمط notify_user الحالي)
-- ------------------------------------------------------------
create or replace function public.notify_chat_user(
  p_recipient   uuid,
  p_type        public.chat_notification_type,
  p_actor       uuid,
  p_channel_id  uuid,
  p_message_id  uuid,
  p_subject     text,
  p_href        text
)
returns void
language plpgsql
security definer
as $$
begin
  if p_recipient is null or p_recipient = p_actor then
    return;
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_recipient and status = 'active' and deleted_at is null
  ) then
    return;
  end if;

  insert into public.chat_notifications (
    recipient_id, type, actor_id, channel_id, message_id, subject, href
  )
  values (
    p_recipient, p_type, p_actor, p_channel_id, p_message_id,
    coalesce(p_subject, ''), p_href
  );
end;
$$;


-- ------------------------------------------------------------
-- 8) Trigger: منشن @everyone / رد على رسالة → إشعار تلقائي
-- ------------------------------------------------------------
create or replace function public.trg_notify_chat_message()
returns trigger
language plpgsql
security definer
as $$
declare
  r record;
  v_href text;
begin
  v_href := '/chat/' || new.channel_id::text || '#message-' || new.id::text;

  -- رد على رسالة: نبّه صاحب الرسالة الأصلية
  if new.reply_to_message_id is not null then
    perform public.notify_chat_user(
      (select sender_id from public.chat_messages where id = new.reply_to_message_id),
      'reply', new.sender_id, new.channel_id, new.id,
      left(coalesce(new.content, ''), 80), v_href
    );
  end if;

  -- @everyone: نبّه كل أعضاء القناة
  if new.mentions_everyone then
    for r in
      select member_id from public.chat_channel_members
      where channel_id = new.channel_id and member_id <> new.sender_id
    loop
      perform public.notify_chat_user(
        r.member_id, 'mention_everyone', new.sender_id, new.channel_id, new.id,
        left(coalesce(new.content, ''), 80), v_href
      );
    end loop;
  end if;

  return new;
end;
$$;

create trigger trg_chat_message_notify
  after insert on public.chat_messages
  for each row execute function public.trg_notify_chat_message();

-- ملاحظة: منطق @here (بس المتواجدين حالياً) ومنشن فردي (@اسم) بيحتاج
-- معرفة "مين متصل الآن" — هاد بيُبنى بالتكامل مع Pusher Presence Channels
-- بمرحلة الواجهة، مش بالـ trigger هون.