// src/app/api/chat/channels/[channelId]/messages/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ChatMessageData } from '@/components/dashboard/chat/ChatMessageBubble'

/*
  الأمان هون ما بيعتمد على أي فحص يدوي بهالملف — RLS على chat_messages
  (is_chat_channel_member) هو اللي بيمنع أي حد مو عضو بالقناة من جلب
  رسائلها أصلاً، حتى لو حاول يغيّر channelId بالرابط مباشرة.

  ⚠️ ملاحظة: PostgREST ما بيدعم nested embed لجدول جوا نفسه بسهولة
  (chat_messages داخل chat_messages للرد/الفوروورد) — لهيك بنجيب رسائل
  الأساس أول، وبعدين كويريات ثانية منفصلة لجلب "رسائل الرد"، التفاعلات،
  وحالة القراءة، ونربطهم بالكود بدل الاعتماد على embed معقّد وهش.
*/
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      id, sender_id, content, created_at, is_pinned, deleted_at, edited_at,
      reply_to_message_id,
      forwarded_from_channel_id,
      sender:profiles!chat_messages_sender_id_fkey(first_name, last_name, color, avatar_url),
      forwarded_channel:chat_channels!chat_messages_forwarded_from_channel_id_fkey(name_ar, name_en),
      forwarded_sender:profiles!chat_messages_forwarded_from_sender_id_fkey(first_name, last_name)
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const rows = data ?? []
  const messageIds = rows.map((r: any) => r.id)

  // رسائل "الرد على" اللي فعلاً محتاجينها
  const replyIds = [...new Set(rows.map((r: any) => r.reply_to_message_id).filter(Boolean))]
  const repliesMap = new Map<string, { id: string; content: string | null; senderName: string }>()

  if (replyIds.length > 0) {
    const { data: replyRows } = await supabase
      .from('chat_messages')
      .select('id, content, sender:profiles!chat_messages_sender_id_fkey(first_name, last_name)')
      .in('id', replyIds)

    for (const r of replyRows ?? []) {
      repliesMap.set(r.id, {
        id: r.id,
        content: r.content,
        senderName: `${(r.sender as any)?.first_name ?? ''} ${(r.sender as any)?.last_name ?? ''}`.trim(),
      })
    }
  }

  // تفاعلات كل رسائل القناة، مجمّعة بالكود حسب message_id
  const reactionsByMessage = new Map<
    string,
    { emoji: string; count: number; reactedByMe: boolean; reactorNames: string[] }[]
  >()

  // عدد القراء (غير المرسل) لكل رسالة — لحالة التيكين
  const readCountByMessage = new Map<string, number>()

  if (messageIds.length > 0) {
    const { data: reactionRows } = await supabase
      .from('chat_message_reactions')
      .select('message_id, emoji, member_id, profiles!chat_message_reactions_member_id_fkey(first_name, last_name)')
      .in('message_id', messageIds)

    for (const r of reactionRows ?? []) {
      const list = reactionsByMessage.get(r.message_id) ?? []
      const name = `${(r.profiles as any)?.first_name ?? ''} ${(r.profiles as any)?.last_name ?? ''}`.trim()
      let entry = list.find((x) => x.emoji === r.emoji)
      if (!entry) {
        entry = { emoji: r.emoji, count: 0, reactedByMe: false, reactorNames: [] }
        list.push(entry)
      }
      entry.count += 1
      entry.reactorNames.push(name)
      if (r.member_id === user?.id) entry.reactedByMe = true
      reactionsByMessage.set(r.message_id, list)
    }

    const { data: readRows } = await supabase
      .from('chat_message_reads')
      .select('message_id, member_id')
      .in('message_id', messageIds)

    const senderByMessageId = new Map(rows.map((r: any) => [r.id, r.sender_id]))
    for (const r of readRows ?? []) {
      if (r.member_id !== senderByMessageId.get(r.message_id)) {
        readCountByMessage.set(r.message_id, (readCountByMessage.get(r.message_id) ?? 0) + 1)
      }
    }
  }

  const messages: ChatMessageData[] = rows.map((row: any) => ({
    id: row.id,
    senderId: row.sender_id,
    senderName: `${row.sender?.first_name ?? ''} ${row.sender?.last_name ?? ''}`.trim(),
    senderInitials: `${(row.sender?.first_name ?? '')[0] ?? ''}${(row.sender?.last_name ?? '')[0] ?? ''}`.toUpperCase(),
    senderColor: row.sender?.color ?? '#458482',
    senderAvatarUrl: row.sender?.avatar_url ?? null,
    content: row.content,
    createdAt: row.created_at,
    isPinned: row.is_pinned,
    isDeleted: !!row.deleted_at,
    editedAt: row.edited_at,
    replyTo: row.reply_to_message_id ? repliesMap.get(row.reply_to_message_id) ?? null : null,
    forwardedFrom: row.forwarded_from_channel_id
      ? {
          channelName: row.forwarded_channel?.name_ar ?? row.forwarded_channel?.name_en ?? '',
          senderName: `${row.forwarded_sender?.first_name ?? ''} ${row.forwarded_sender?.last_name ?? ''}`.trim(),
        }
      : null,
    reactions: reactionsByMessage.get(row.id) ?? [],
    readByCount: readCountByMessage.get(row.id) ?? 0,
  }))

  return NextResponse.json(messages)
}