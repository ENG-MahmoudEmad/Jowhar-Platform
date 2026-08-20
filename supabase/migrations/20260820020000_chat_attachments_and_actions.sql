-- supabase/migrations/20260820020000_chat_attachments_and_actions.sql

-- ============================================================
-- Chat Feature — Migration 3/N
-- مرفقات R2 (معطّلة حالياً) + RPC functions لكل عمليات الرسائل
-- ============================================================

-- ------------------------------------------------------------
-- 1) chat_attachments — روابط R2 (البنية جاهزة، الميزة معطّلة بالواجهة)
-- ------------------------------------------------------------
create table public.chat_attachments (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid not null references public.chat_messages(id) on delete cascade,

  r2_key        text not null,          -- مسار الملف بـ R2، مش الملف نفسه
  file_name     text not null,
  file_type     text not null check (file_type in ('image', 'video', 'voice')),
  file_size     bigint,                 -- بالبايت
  width         integer,                -- للصور/الفيديو
  height        integer,
  duration_seconds integer,             -- للفيديو/الصوت

  uploaded_by   uuid not null references public.profiles(id),
  created_at    timestamp with time zone not null default now()
);

comment on table public.chat_attachments is
  'روابط مرفقات R2 فقط — لا تُخزَّن الملفات هون. معطّلة بالواجهة لحد شراء Supabase Pro وربط R2 فعلياً.';

create index idx_chat_attachments_message on public.chat_attachments(message_id);

create policy chat_attachments_select on public.chat_attachments
  for select using (
    exists (
      select 1 from public.chat_messages m
      where m.id = message_id
        and public.is_chat_channel_member(auth.uid(), m.channel_id)
    )
  );

create policy chat_attachments_insert on public.chat_attachments
  for insert with check (uploaded_by = auth.uid());


-- ------------------------------------------------------------
-- 2) إرسال رسالة (مع فحص slow mode الكامل)
-- ------------------------------------------------------------
create or replace function public.send_chat_message(
  p_channel_id            uuid,
  p_content               text,
  p_reply_to_message_id   uuid default null,
  p_mentions_everyone     boolean default false,
  p_mentions_here         boolean default false
)
returns public.chat_messages
language plpgsql
security definer
as $$
declare
  v_slow_mode_seconds integer;
  v_last_message_at   timestamp with time zone;
  v_result            public.chat_messages;
begin
  if not public.is_chat_channel_member(auth.uid(), p_channel_id) then
    raise exception 'لست عضواً بهذه القناة';
  end if;

  if exists (
    select 1 from public.chat_member_restrictions
    where channel_id = p_channel_id and member_id = auth.uid() and can_send_messages = false
  ) then
    raise exception 'ممنوع من الكتابة بهذه القناة';
  end if;

  -- @everyone: حصراً Chief/Developer أو مين عنده صلاحية إدارة (احتياطي إضافي،
  -- الواجهة أصلاً ما بتعرضها لغير المصرّح لهم)
  if p_mentions_everyone and not public.is_chat_super_admin(auth.uid()) then
    raise exception '@everyone حصري بالشيف أدمن والديفيلوبر';
  end if;

  -- فحص Slow Mode (Chief/Developer ومشرفو chat.manage_slow_mode مستثنون)
  select slow_mode_seconds into v_slow_mode_seconds
  from public.chat_channels where id = p_channel_id;

  if v_slow_mode_seconds > 0
     and not public.is_chat_super_admin(auth.uid())
     and not public.has_chat_permission(auth.uid(), p_channel_id, 'chat.manage_slow_mode') then

    select max(created_at) into v_last_message_at
    from public.chat_messages
    where channel_id = p_channel_id and sender_id = auth.uid() and deleted_at is null;

    if v_last_message_at is not null
       and v_last_message_at > now() - (v_slow_mode_seconds || ' seconds')::interval then
      raise exception 'الوضع البطيء مفعّل — انتظر شوي قبل الرسالة التالية';
    end if;
  end if;

  insert into public.chat_messages (
    channel_id, sender_id, content, reply_to_message_id,
    mentions_everyone, mentions_here
  )
  values (
    p_channel_id, auth.uid(), p_content, p_reply_to_message_id,
    p_mentions_everyone, p_mentions_here
  )
  returning * into v_result;

  return v_result;
end;
$$;


-- ------------------------------------------------------------
-- 3) حذف رسالة (صاحبها، أو مشرف عنده صلاحية، أو super admin)
-- ------------------------------------------------------------
create or replace function public.delete_chat_message(p_message_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_channel_id uuid;
  v_sender_id  uuid;
begin
  select channel_id, sender_id into v_channel_id, v_sender_id
  from public.chat_messages where id = p_message_id;

  if v_channel_id is null then
    raise exception 'الرسالة غير موجودة';
  end if;

  if not (
    v_sender_id = auth.uid()
    or public.has_chat_permission(auth.uid(), v_channel_id, 'chat.delete_others_messages')
  ) then
    raise exception 'ليس لديك صلاحية حذف هذه الرسالة';
  end if;

  update public.chat_messages
  set deleted_at = now(), deleted_by = auth.uid()
  where id = p_message_id;
end;
$$;


-- ------------------------------------------------------------
-- 4) تثبيت/إلغاء تثبيت رسالة
-- ------------------------------------------------------------
create or replace function public.toggle_pin_chat_message(p_message_id uuid, p_pin boolean)
returns void
language plpgsql
security definer
as $$
declare
  v_channel_id uuid;
begin
  select channel_id into v_channel_id from public.chat_messages where id = p_message_id;

  if v_channel_id is null then
    raise exception 'الرسالة غير موجودة';
  end if;

  if not public.has_chat_permission(auth.uid(), v_channel_id, 'chat.pin_messages') then
    raise exception 'ليس لديك صلاحية تثبيت الرسائل بهذه القناة';
  end if;

  update public.chat_messages
  set is_pinned = p_pin,
      pinned_at = case when p_pin then now() else null end,
      pinned_by = case when p_pin then auth.uid() else null end
  where id = p_message_id;
end;
$$;


-- ------------------------------------------------------------
-- 5) Forward رسالة لقناة تانية
-- ------------------------------------------------------------
create or replace function public.forward_chat_message(
  p_message_id      uuid,
  p_to_channel_id   uuid
)
returns public.chat_messages
language plpgsql
security definer
as $$
declare
  v_original public.chat_messages;
  v_result   public.chat_messages;
begin
  select * into v_original from public.chat_messages where id = p_message_id;

  if v_original.id is null or v_original.deleted_at is not null then
    raise exception 'الرسالة الأصلية غير موجودة';
  end if;

  if not public.is_chat_channel_member(auth.uid(), v_original.channel_id) then
    raise exception 'لست عضواً بالقناة المصدر';
  end if;

  if not public.is_chat_channel_member(auth.uid(), p_to_channel_id) then
    raise exception 'لست عضواً بالقناة الوجهة';
  end if;

  insert into public.chat_messages (
    channel_id, sender_id, content,
    forwarded_from_message_id, forwarded_from_channel_id, forwarded_from_sender_id
  )
  values (
    p_to_channel_id, auth.uid(), v_original.content,
    v_original.id, v_original.channel_id, v_original.sender_id
  )
  returning * into v_result;

  return v_result;
end;
$$;


-- ------------------------------------------------------------
-- 6) /clear — حذف جماعي، حصراً Chief/Developer، بدون أي تفويض ممكن
-- ------------------------------------------------------------
create or replace function public.clear_chat_messages(
  p_channel_id  uuid,
  p_count       integer default null   -- null = /clear all
)
returns integer
language plpgsql
security definer
as $$
declare
  v_deleted integer;
begin
  if not public.is_chat_super_admin(auth.uid()) then
    raise exception '/clear حصري بالشيف أدمن والديفيلوبر';
  end if;

  if p_count is null then
    -- /clear all
    update public.chat_messages
    set deleted_at = now(), deleted_by = auth.uid()
    where channel_id = p_channel_id and deleted_at is null;
  else
    -- /clear [عدد] — آخر عدد رسائل غير محذوفة
    update public.chat_messages
    set deleted_at = now(), deleted_by = auth.uid()
    where id in (
      select id from public.chat_messages
      where channel_id = p_channel_id and deleted_at is null
      order by created_at desc
      limit p_count
    );
  end if;

  get diagnostics v_deleted = row_count;

  perform public.log_admin_action(
    auth.uid(),
    'chat.clear_messages',
    jsonb_build_object('channel_id', p_channel_id, 'count_requested', p_count, 'deleted', v_deleted)
  );

  return v_deleted;
end;
$$;


-- ------------------------------------------------------------
-- 7) إغلاق/فتح قناة — حصراً super admin
-- ------------------------------------------------------------
create or replace function public.toggle_chat_channel_archive(p_channel_id uuid, p_archive boolean)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_chat_super_admin(auth.uid()) then
    raise exception 'إغلاق/فتح القنوات حصري بالشيف أدمن والديفيلوبر';
  end if;

  update public.chat_channels
  set is_archived = p_archive,
      archived_at = case when p_archive then now() else null end,
      archived_by = case when p_archive then auth.uid() else null end
  where id = p_channel_id;

  if p_archive then
    perform public.notify_chat_user(
      m.member_id, 'channel_archived', auth.uid(), p_channel_id, null,
      (select name_ar from public.chat_channels where id = p_channel_id),
      '/chat'
    )
    from public.chat_channel_members m
    where m.channel_id = p_channel_id and m.member_id <> auth.uid();
  else
    perform public.notify_chat_user(
      m.member_id, 'channel_unarchived', auth.uid(), p_channel_id, null,
      (select name_ar from public.chat_channels where id = p_channel_id),
      '/chat/' || p_channel_id::text
    )
    from public.chat_channel_members m
    where m.channel_id = p_channel_id and m.member_id <> auth.uid();
  end if;
end;
$$;


-- ------------------------------------------------------------
-- 8) إضافة أعضاء لقناة — حصراً super admin، مع إشعار تلقائي
-- ------------------------------------------------------------
create or replace function public.add_chat_channel_members(
  p_channel_id  uuid,
  p_member_ids  uuid[]
)
returns void
language plpgsql
security definer
as $$
declare
  v_member_id uuid;
begin
  if not public.is_chat_super_admin(auth.uid()) then
    raise exception 'إضافة أعضاء للقنوات حصري بالشيف أدمن والديفيلوبر';
  end if;

  foreach v_member_id in array p_member_ids loop
    insert into public.chat_channel_members (channel_id, member_id, added_by)
    values (p_channel_id, v_member_id, auth.uid())
    on conflict (channel_id, member_id) do nothing;

    perform public.notify_chat_user(
      v_member_id, 'added_to_channel', auth.uid(), p_channel_id, null,
      (select name_ar from public.chat_channels where id = p_channel_id),
      '/chat/' || p_channel_id::text
    );
  end loop;
end;
$$;


-- ------------------------------------------------------------
-- 9) تعديل مدة الأرشيف العامة — حصراً super admin
-- ------------------------------------------------------------
create or replace function public.update_chat_retention_months(p_months smallint)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_chat_super_admin(auth.uid()) then
    raise exception 'تعديل مدة الأرشيف حصري بالشيف أدمن والديفيلوبر';
  end if;

  if p_months not in (1, 3, 6, 12) then
    raise exception 'قيمة غير صالحة — المسموح: 1، 3، 6، أو 12 شهر';
  end if;

  update public.chat_retention_settings
  set retention_months = p_months, updated_by = auth.uid()
  where id = 1;
end;
$$;