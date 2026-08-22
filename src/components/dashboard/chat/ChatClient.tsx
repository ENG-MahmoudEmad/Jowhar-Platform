// src/components/dashboard/chat/ChatClient.tsx
"use client"

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LazyMotion, domAnimation } from 'framer-motion'
import { MessageSquare, Settings, Plus } from 'lucide-react'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'
import ChatChannelList, { type ChatChannelSummary } from './ChatChannelList'
import ChatMessageBubble, { type ChatMessageData } from './ChatMessageBubble'
import ChatComposer from './ChatComposer'
import ChatForwardPicker from './ChatForwardPicker'
import ChatChannelSettings from './ChatChannelSettings'
import ChatCreateChannelModal from './ChatCreateChannelModal'
import { DEFAULT_QUICK_EMOJIS } from './ChatMessageReactions'
import type { RosterMember } from './ChatMemberPicker'
import { useChatChannel } from '@/lib/chat/useChatChannel'

interface ChatClientProps {
  channels: ChatChannelSummary[]
  currentUserId: string
  currentUserDisplay: { name: string; initials: string; color: string; avatarUrl: string | null }
  canDeleteOthersMessages: boolean
  canPinMessages: boolean
  /** Chief/Developer فقط — يقدروا يديروا صورة القناة وقائمة الإيموجي */
  canManageChannels: boolean
  roster: RosterMember[]
}

function ChatClient({
  channels: initialChannels,
  currentUserId,
  currentUserDisplay,
  canDeleteOthersMessages,
  canPinMessages,
  canManageChannels,
  roster,
}: ChatClientProps) {
  const { lang, isRTL } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [channels, setChannels] = useState<ChatChannelSummary[]>(initialChannels)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [createChannelOpen, setCreateChannelOpen] = useState(false)

  const [activeChannelId, setActiveChannelId] = useState<string | null>(channels[0]?.id ?? null)
  const [replyingTo, setReplyingTo] = useState<ChatMessageData | null>(null)
  const [forwardTarget, setForwardTarget] = useState<ChatMessageData | null>(null)

  const { messages, loading, sendMessage, retryMessage, deleteMessage, togglePin, forwardMessage, reactMessage, markRead } =
    useChatChannel(activeChannelId, currentUserId, currentUserDisplay)

  const scrollRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const pendingReadIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length])

  // نجمّع كل الرسائل اللي دخلت الشاشة خلال 1.5 ثانية ونبعتهم دفعة وحدة
  // بدل نداء منفصل لكل رسالة — نفس فلسفة "تعليم قراءة عند الدخول
  // الفعلي" اللي تيليجرام يعتمدها.
  useEffect(() => {
    const timer = setInterval(() => {
      if (pendingReadIds.current.size === 0) return
      const ids = Array.from(pendingReadIds.current)
      pendingReadIds.current.clear()
      void markRead(ids)
    }, 1500)
    return () => clearInterval(timer)
  }, [markRead])

  const observeMessageRef = useCallback(
    (node: HTMLDivElement | null, messageId: string, isOwn: boolean) => {
      if (!node || isOwn) return // ما نعلّم رسائلنا كمقروءة من عندنا

      if (!observerRef.current) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                const id = entry.target.getAttribute('data-message-id')
                if (id) pendingReadIds.current.add(id)
              }
            }
          },
          { threshold: 0.6 },
        )
      }
      node.setAttribute('data-message-id', messageId)
      observerRef.current.observe(node)
    },
    [],
  )

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

  const handleForward = useCallback((message: ChatMessageData) => setForwardTarget(message), [])

  const handleConfirmForward = useCallback(
    (toChannelId: string) => {
      if (forwardTarget) void forwardMessage(forwardTarget.id, toChannelId)
      setForwardTarget(null)
    },
    [forwardTarget, forwardMessage],
  )

  const handleCloseForwardPicker = useCallback(() => setForwardTarget(null), [])

  const handleOpenSettings = useCallback(() => setSettingsOpen(true), [])
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), [])
  const handleOpenCreateChannel = useCallback(() => setCreateChannelOpen(true), [])
  const handleCloseCreateChannel = useCallback(() => setCreateChannelOpen(false), [])

  const handleChannelCreated = useCallback((channel: ChatChannelSummary) => {
    setChannels((prev) => [...prev, channel])
    setActiveChannelId(channel.id)
  }, [])

  const handleChannelUpdated = useCallback(
    (patch: { imageUrl?: string; allowedReactionEmojis?: string[] }) => {
      if (!activeChannelId) return
      setChannels((prev) =>
        prev.map((c) =>
          c.id === activeChannelId
            ? {
                ...c,
                imageUrl: patch.imageUrl ?? c.imageUrl,
                allowedReactionEmojis: patch.allowedReactionEmojis ?? c.allowedReactionEmojis,
              }
            : c,
        ),
      )
    },
    [activeChannelId],
  )

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? null,
    [channels, activeChannelId],
  )

  const allowedEmojis = activeChannel?.allowedReactionEmojis ?? DEFAULT_QUICK_EMOJIS

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
          {canManageChannels && (
            <div className="p-2 pb-0">
              <button
                type="button"
                onClick={handleOpenCreateChannel}
                className="w-full flex items-center gap-1.5 justify-center px-3 py-2 rounded-xl text-[11px] font-bold"
                style={{ background: 'rgba(69,132,130,0.14)', color: '#458482', cursor: 'pointer' }}
              >
                <Plus size={13} />
                {lang === 'ar' ? 'قناة جديدة' : 'New Channel'}
              </button>
            </div>
          )}
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
                  className="text-[13px] font-black flex-1"
                  style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}
                >
                  {channelDisplayName}
                </h2>
                {canManageChannels && (
                  <button
                    type="button"
                    onClick={handleOpenSettings}
                    className="p-1.5 rounded-lg"
                    style={{ color: 'var(--foreground-muted)', cursor: 'pointer' }}
                    title={lang === 'ar' ? 'إعدادات القناة' : 'Channel settings'}
                  >
                    <Settings size={15} />
                  </button>
                )}
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
                    <div
                      key={message.id}
                      ref={(node) => observeMessageRef(node, message.id, message.senderId === currentUserId)}
                    >
                      <ChatMessageBubble
                        message={message}
                        isOwn={message.senderId === currentUserId}
                        isHighlightedAsReplyTarget={replyingTo?.id === message.id}
                        canDeleteOthers={canDeleteOthersMessages}
                        canPin={canPinMessages}
                        onReply={handleReply}
                        onForward={handleForward}
                        onDelete={deleteMessage}
                        onTogglePin={togglePin}
                        onRetry={retryMessage}
                        onReact={reactMessage}
                        allowedEmojis={allowedEmojis}
                      />
                    </div>
                  ))
                )}
              </div>

              <ChatComposer replyingTo={replyingTo} onCancelReply={handleCancelReply} onSend={handleSend} />
            </>
          )}
        </div>
      </div>

      <ChatForwardPicker
        open={!!forwardTarget}
        channels={channels}
        excludeChannelId={activeChannelId}
        onClose={handleCloseForwardPicker}
        onSelect={handleConfirmForward}
      />

      {settingsOpen && activeChannel && (
        <ChatChannelSettings
          channelId={activeChannel.id}
          channelName={channelDisplayName}
          currentImageUrl={activeChannel.imageUrl}
          currentAllowedEmojis={activeChannel.allowedReactionEmojis}
          roster={roster}
          onClose={handleCloseSettings}
          onUpdated={handleChannelUpdated}
        />
      )}

      {createChannelOpen && (
        <ChatCreateChannelModal
          roster={roster}
          currentUserId={currentUserId}
          onClose={handleCloseCreateChannel}
          onCreated={handleChannelCreated}
        />
      )}
    </LazyMotion>
  )
}

export default memo(ChatClient)