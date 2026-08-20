// src/app/(dashboard)/chat/page.tsx

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChatClient from '@/components/dashboard/chat/ChatClient'
import type { ChatChannelSummary } from '@/components/dashboard/chat/ChatChannelList'

export default async function ChatPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_developer, is_chief')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = !!(profile?.is_developer || profile?.is_chief)

  // القنوات المرئية للمستخدم — الـ RLS (is_chat_channel_member) بتفلتر
  // تلقائياً القنوات اللي هو مو عضو فيها، فما بتظهر أصلاً.
  const { data: memberships } = await supabase
    .from('chat_channel_members')
    .select('is_muted, channel:chat_channels(id, name_en, name_ar, is_archived)')
    .eq('member_id', user.id)

  const channels: ChatChannelSummary[] = (memberships ?? [])
    .filter((m: any) => m.channel)
    .map((m: any) => ({
      id: m.channel.id,
      nameEn: m.channel.name_en,
      nameAr: m.channel.name_ar,
      isArchived: m.channel.is_archived,
      unreadCount: 0, // TODO: يُحسب لاحقاً من chat_message_reads مقابل chat_messages
      isMuted: m.is_muted,
    }))
    .filter((c) => !c.isArchived)

  // صلاحيات إشراف عامة (مبسّطة لهاي المرحلة — لاحقاً تُحسب لكل قناة تحديداً)
  const canDeleteOthersMessages = isSuperAdmin
  const canPinMessages = isSuperAdmin

  return (
    <div className="h-[calc(100vh-2rem)] p-4">
      <ChatClient
        channels={channels}
        currentUserId={user.id}
        canDeleteOthersMessages={canDeleteOthersMessages}
        canPinMessages={canPinMessages}
      />
    </div>
  )
}