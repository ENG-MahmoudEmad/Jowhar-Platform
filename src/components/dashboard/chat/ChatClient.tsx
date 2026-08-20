// src/components/dashboard/chat/ChatClient.tsx
"use client"

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LazyMotion, domAnimation } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'
import ChatChannelList, { type ChatChannelSummary } from './ChatChannelList'
import ChatMessageBubble, { type ChatMessageData } from './ChatMessageBubble'
import ChatComposer from './ChatComposer'
import { useChatChannel } from '@/lib/chat/useChatChannel'

interface ChatClientProps {
  channels: ChatChannelSummary[]
  currentUserId: string
  canDeleteOthersMessages: boolean
  canPinMessages: boolean
}

function ChatClient({ channels, currentUserId, canDeleteOthersMessages, canPinMessages }: ChatClientProps) {
  const { lang, isRTL } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [activeChannelId, setActiveChannelId] = useState<string | null>(channels[0]?.id ?? null)
  const [replyingTo, setReplyingTo] = useState<ChatMessageData | null>(null)

  const { messages, loading, sendMessage, deleteMessage, togglePin, forwardMessage } =
    useChatChannel(activeChannelId, currentUserId)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length])

  const handleSelectChannel = useCallback((channelId: string) => {
    setActiveChannelId(channelId)
    setReplyingTo(null)
  }, [])

  const handleReply = useCallback((message: ChatMessageData) => setReplyingTo(message), [])
  const handleCancelReply = useCallback(() => setReplyingTo(null), [])

  const handleSend = useCallback(
    (content: string, replyToMessageId?: string) => {
      void sendMessage(content, replyToMessageId)
      setReplyingTo(null)
    },
    [sendMessage],
  )

  const handleForward = useCallback(
    (message: ChatMessageData) => {
      // اختيار القناة الوجهة بواجهة لاحقة (قائمة منسدلة) — مؤقتاً لأول قناة تانية متاحة
      const target = channels.find((c) => c.id !== activeChannelId)
      if (target) void forwardMessage(message.id, target.id)
    },
    [channels, activeChannelId, forwardMessage],
  )

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? null,
    [channels, activeChannelId],
  )

  const channelDisplayName = activeChannel ? (lang === 'ar' ? activeChannel.nameAr : activeChannel.nameEn) : ''

  const tx = useMemo(() => ({
    empty: lang === 'ar' ? 'اختر قناة للبدء' : 'Select a channel to start',
    noMessages: lang === 'ar' ? 'لا توجد رسائل بعد — ابدأ المحادثة' : 'No messages yet — start the conversation',
  }), [lang])

  return (
    <LazyMotion features={domAnimation}>
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="flex h-full rounded-2xl overflow-hidden"
        style={{ background: 'var(--card)', border: `1px solid ${isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)'}` }}
      >
        {/* قائمة القنوات */}
        <div
          className="w-64 shrink-0 hidden md:flex flex-col"
          style={{ borderInlineEnd: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
        >
          <ChatChannelList channels={channels} activeChannelId={activeChannelId} onSelect={handleSelectChannel} />
        </div>

        {/* منطقة الرسائل */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeChannel ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <MessageSquare size={28} style={{ color: 'var(--foreground-muted)', opacity: 0.4 }} />
              <p className="text-[12px] font-medium" style={{ color: 'var(--foreground-muted)' }}>{tx.empty}</p>
            </div>
          ) : (
            <>
              <div
                className="shrink-0 px-4 py-3 flex items-center gap-2"
                style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
              >
                <h2
                  className="text-[13px] font-black"
                  style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}
                >
                  {channelDisplayName}
                </h2>
              </div>

              <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto py-2">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[11px]" style={{ color: 'var(--foreground-muted)' }}>...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[11px]" style={{ color: 'var(--foreground-muted)' }}>{tx.noMessages}</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <ChatMessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.senderId === currentUserId}
                      isHighlightedAsReplyTarget={replyingTo?.id === message.id}
                      canDeleteOthers={canDeleteOthersMessages}
                      canPin={canPinMessages}
                      onReply={handleReply}
                      onForward={handleForward}
                      onDelete={deleteMessage}
                      onTogglePin={togglePin}
                    />
                  ))
                )}
              </div>

              <ChatComposer replyingTo={replyingTo} onCancelReply={handleCancelReply} onSend={handleSend} />
            </>
          )}
        </div>
      </div>
    </LazyMotion>
  )
}

export default memo(ChatClient)