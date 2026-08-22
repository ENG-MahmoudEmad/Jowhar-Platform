// src/app/(dashboard)/chat/chatActions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { pusherServer } from '@/lib/pusher/server'
import type { ChatMessageData } from '@/components/dashboard/chat/ChatMessageBubble'

/*
  كل Server Action هون بتعمل شيئين بالترتيب:
  1) تنادي RPC function بقاعدة البيانات (اللي فيها كل فحص الصلاحيات
     والـ RLS — هون ما بنكرر أي منطق صلاحيات، هو مصدر الحقيقة الوحيد).
  2) لو نجحت، تطلق حدث Pusher عشان كل الأعضاء المتصلين يشوفوا التحديث
     لحظياً بدون Refresh.

  ⚠️ الترتيب هيك مو عكسه — نطلق الحدث فقط بعد تأكيد نجاح RPC، وإلا ممكن
  نبلّغ عن رسالة اتحذفت فعلياً بسبب فشل صلاحيات.
*/

async function mapMessageRow(row: any): Promise<ChatMessageData> {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender_name ?? '',
    senderInitials: row.sender_initials ?? '',
    senderColor: row.sender_color ?? '#458482',
    senderAvatarUrl: row.sender_avatar_url ?? null,
    content: row.content,
    createdAt: row.created_at,
    isPinned: row.is_pinned,
    isDeleted: !!row.deleted_at,
    editedAt: row.edited_at,
    replyTo: row.reply_to_id
      ? { id: row.reply_to_id, senderName: row.reply_to_sender_name ?? '', content: row.reply_to_content ?? null }
      : null,
    forwardedFrom: row.forwarded_from_channel_id
      ? { channelName: row.forwarded_from_channel_name ?? '', senderName: row.forwarded_from_sender_name ?? '' }
      : null,
  }
}

export async function sendChatMessageAction(
  channelId: string,
  content: string,
  replyToMessageId?: string,
  socketId?: string,
  senderDisplay?: { name: string; initials: string; color: string; avatarUrl: string | null },
): Promise<ChatMessageData> {
  const supabase = await createClient()

  // send_chat_message عرّفناها بـ "returning *" بالـSQL — يعني القيمة
  // الراجعة أصلاً فيها الصف الكامل (id, content, created_at, ...).
  // ⚠️ سرّعنا هون: بدل استعلام SELECT ثاني منفصل لجلب اسم/صورة/لون
  // المرسل (رحلة شبكة كاملة إضافية كانت تؤخر تأكيد الإرسال)، نستخدم
  // بيانات المرسل الجاهزة أصلاً بالمتصفح (senderDisplay من UserContext)
  // — المستخدم يعرف اسمه ولونه بدون ما يسأل السيرفر من جديد.
  const { data, error } = await supabase.rpc('send_chat_message', {
    p_channel_id: channelId,
    p_content: content,
    p_reply_to_message_id: replyToMessageId ?? undefined,
    p_mentions_everyone: false,
    p_mentions_here: false,
  })

  if (error) throw error

  const message: ChatMessageData = {
    id: data.id,
    senderId: data.sender_id,
    senderName: senderDisplay?.name ?? '',
    senderInitials: senderDisplay?.initials ?? '',
    senderColor: senderDisplay?.color ?? '#458482',
    senderAvatarUrl: senderDisplay?.avatarUrl ?? null,
    content: data.content,
    createdAt: data.created_at,
    isPinned: data.is_pinned,
    isDeleted: !!data.deleted_at,
    editedAt: data.edited_at,
    replyTo: null, // معروضة أصلاً محلياً بالـReply preview وقت الإرسال، ما محتاجينها بالـecho
    forwardedFrom: null,
    reactions: [],
    readByCount: 0,
  }

  await pusherServer.trigger(
    `chat-channel-${channelId}`,
    'new-message',
    message,
    socketId ? { socket_id: socketId } : undefined,
  )

  return message
}

export async function deleteChatMessageAction(messageId: string, socketId?: string): Promise<void> {
  const supabase = await createClient()

  const { data: msg } = await supabase
    .from('chat_messages')
    .select('channel_id')
    .eq('id', messageId)
    .single()

  const { error } = await supabase.rpc('delete_chat_message', { p_message_id: messageId })
  if (error) throw error

  if (msg) {
    await pusherServer.trigger(
      `chat-channel-${msg.channel_id}`,
      'message-updated',
      { id: messageId, isDeleted: true },
      socketId ? { socket_id: socketId } : undefined,
    )
  }
}

export async function toggleChatMessagePinAction(messageId: string, pin: boolean, socketId?: string): Promise<void> {
  const supabase = await createClient()

  const { data: msg } = await supabase
    .from('chat_messages')
    .select('channel_id')
    .eq('id', messageId)
    .single()

  const { error } = await supabase.rpc('toggle_pin_chat_message', {
    p_message_id: messageId,
    p_pin: pin,
  })
  if (error) throw error

  if (msg) {
    await pusherServer.trigger(
      `chat-channel-${msg.channel_id}`,
      'message-updated',
      { id: messageId, isPinned: pin },
      socketId ? { socket_id: socketId } : undefined,
    )
  }
}

export async function forwardChatMessageAction(messageId: string, toChannelId: string): Promise<void> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('forward_chat_message', {
    p_message_id: messageId,
    p_to_channel_id: toChannelId,
  })
  if (error) throw error

  const { data: fullRow } = await supabase
    .from('chat_messages')
    .select(`
      id, sender_id, content, created_at, is_pinned, deleted_at, edited_at,
      forwarded_from_channel_id,
      profiles!chat_messages_sender_id_fkey(first_name, last_name, color, avatar_url)
    `)
    .eq('id', data.id)
    .single()

  const message = await mapMessageRow({
    ...fullRow,
    sender_name: fullRow ? `${fullRow.profiles?.first_name ?? ''} ${fullRow.profiles?.last_name ?? ''}`.trim() : '',
    sender_color: fullRow?.profiles?.color,
    sender_avatar_url: fullRow?.profiles?.avatar_url,
  })

  await pusherServer.trigger(`chat-channel-${toChannelId}`, 'new-message', message)
}

/*
  التفاعلات: insert لو ما موجودة، delete لو موجودة (toggle بسيط).
  البنية بجدول chat_message_reactions فيها primary key مركّب
  (message_id, member_id, emoji) — فمحاولة insert لتفاعل موجود أصلاً
  رح ترفض بـunique violation، فنتحقق أول.
*/
export async function toggleChatMessageReactionAction(
  messageId: string,
  emoji: string,
  socketId?: string,
): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')

  const { data: msg } = await supabase
    .from('chat_messages')
    .select('channel_id')
    .eq('id', messageId)
    .single()
  if (!msg) throw new Error('message not found')

  const { data: existing } = await supabase
    .from('chat_message_reactions')
    .select('emoji')
    .eq('message_id', messageId)
    .eq('member_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('chat_message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('member_id', user.id)
      .eq('emoji', emoji)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('chat_message_reactions')
      .insert({ message_id: messageId, member_id: user.id, emoji })
    if (error) throw error
  }

  // نبعت التفاعلات المجمّعة الحالية كاملة (أبسط وأضمن من دلتا جزئية)
  const { data: allReactions } = await supabase
    .from('chat_message_reactions')
    .select('emoji, member_id, profiles!chat_message_reactions_member_id_fkey(first_name, last_name)')
    .eq('message_id', messageId)

  await pusherServer.trigger(
    `chat-channel-${msg.channel_id}`,
    'reactions-updated',
    { messageId, reactions: allReactions ?? [] },
    socketId ? { socket_id: socketId } : undefined,
  )
}

/*
  حالة القراءة: upsert على chat_message_reads. نستدعيها لما المستخدم
  فعلياً يشوف الرسالة (IntersectionObserver بالواجهة)، مش لكل رسالة
  لحالها — نجمّع ونبعت دفعة وحدة لتقليل الحمل.
*/
export async function markChatMessagesReadAction(
  messageIds: string[],
  socketId?: string,
): Promise<void> {
  if (messageIds.length === 0) return
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')

  const rows = messageIds.map((id) => ({ message_id: id, member_id: user.id }))
  const { error } = await supabase
    .from('chat_message_reads')
    .upsert(rows, { onConflict: 'message_id,member_id', ignoreDuplicates: true })
  if (error) throw error

  // نجيب channel_id من أول رسالة بس (كل الدفعة من نفس القناة بالتصميم الحالي)
  const { data: msg } = await supabase
    .from('chat_messages')
    .select('channel_id')
    .eq('id', messageIds[0])
    .single()

  if (msg) {
    await pusherServer.trigger(
      `chat-channel-${msg.channel_id}`,
      'messages-read',
      { messageIds, readerId: user.id },
      socketId ? { socket_id: socketId } : undefined,
    )
  }
}

/*
  صورة القناة: رفع فعلي لـSupabase Storage (باكت chat-channel-images
  المفروض إنشاؤه بالداشبورد — يشبه chat-channel-images bucket) ثم
  تحديث image_url. حصري لـChief/Developer (يُفرض بالـRPC نفسها).
*/
export async function uploadChatChannelImageAction(
  channelId: string,
  file: File,
): Promise<string> {
  const supabase = await createClient()

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `channels/${channelId}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('chat-channel-images')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from('chat-channel-images').getPublicUrl(path)

  const { error } = await supabase.rpc('update_chat_channel_image', {
    p_channel_id: channelId,
    p_image_url: urlData.publicUrl,
  })
  if (error) throw error

  await pusherServer.trigger(`chat-channel-${channelId}`, 'channel-updated', {
    id: channelId,
    imageUrl: urlData.publicUrl,
  })

  return urlData.publicUrl
}

/*
  قائمة الإيموجي المسموحة على مستوى القناة — حصري لـChief/Developer.
*/
export async function updateChatChannelEmojiWhitelistAction(
  channelId: string,
  emojis: string[],
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('update_chat_channel_emoji_whitelist', {
    p_channel_id: channelId,
    p_emojis: emojis,
  })
  if (error) throw error

  await pusherServer.trigger(`chat-channel-${channelId}`, 'channel-updated', {
    id: channelId,
    allowedReactionEmojis: emojis,
  })
}