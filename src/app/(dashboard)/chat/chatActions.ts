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
): Promise<ChatMessageData> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('send_chat_message', {
    p_channel_id: channelId,
    p_content: content,
    p_reply_to_message_id: replyToMessageId ?? undefined,
    p_mentions_everyone: false,
    p_mentions_here: false,
  })

  if (error) throw error

  // نجيب النسخة الكاملة (فيها اسم/صورة المرسل عبر join) لعرض متسق للجميع
  const { data: fullRow } = await supabase
    .from('chat_messages')
    .select(`
      id, sender_id, content, created_at, is_pinned, deleted_at, edited_at,
      reply_to_message_id,
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

  // socket_id: يستثني تبويب المرسل نفسه من استقبال نفس الرسالة مرة
  // ثانية عبر Pusher — هو أصلاً استلمها فوراً من قيمة الإرجاع فوق.
  await pusherServer.trigger(
    `chat-channel-${channelId}`,
    'new-message',
    message,
    socketId ? { socket_id: socketId } : undefined,
  )

  return message
}

export async function deleteChatMessageAction(messageId: string): Promise<void> {
  const supabase = await createClient()

  const { data: msg } = await supabase
    .from('chat_messages')
    .select('channel_id')
    .eq('id', messageId)
    .single()

  const { error } = await supabase.rpc('delete_chat_message', { p_message_id: messageId })
  if (error) throw error

  if (msg) {
    await pusherServer.trigger(`chat-channel-${msg.channel_id}`, 'message-updated', {
      id: messageId,
      isDeleted: true,
    })
  }
}

export async function toggleChatMessagePinAction(messageId: string, pin: boolean): Promise<void> {
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
    await pusherServer.trigger(`chat-channel-${msg.channel_id}`, 'message-updated', {
      id: messageId,
      isPinned: pin,
    })
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