// src/components/dashboard/chat/ChatMessageBubble.tsx
"use client"

import React, { memo, useMemo, useCallback, useState } from 'react'
import { m } from 'framer-motion'
import { Pin, Trash2, CornerUpLeft, Forward, MoreHorizontal } from 'lucide-react'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'
import Avatar from '@/components/ui/Avatar'
import { formatRelativeTime } from '@/lib/relativeTime'

export interface ChatMessageData {
  id: string
  senderId: string
  senderName: string
  senderInitials: string
  senderColor: string
  senderAvatarUrl: string | null
  content: string | null
  createdAt: string
  isPinned: boolean
  isDeleted: boolean
  editedAt: string | null
  replyTo: { id: string; senderName: string; content: string | null } | null
  forwardedFrom: { channelName: string; senderName: string } | null
}

interface ChatMessageBubbleProps {
  message: ChatMessageData
  isOwn: boolean
  /** الرد على هاي الرسالة — بيبان مؤقتاً مميز بالأصفر (نمط ديسكورد) */
  isHighlightedAsReplyTarget: boolean
  canDeleteOthers: boolean
  canPin: boolean
  onReply: (message: ChatMessageData) => void
  onForward: (message: ChatMessageData) => void
  onDelete: (messageId: string) => void
  onTogglePin: (messageId: string, pin: boolean) => void
}

const REPLY_HIGHLIGHT_COLOR = '#eab308' // أصفر، نمط ديسكورد

const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
  isOwn,
  isHighlightedAsReplyTarget,
  canDeleteOthers,
  canPin,
  onReply,
  onForward,
  onDelete,
  onTogglePin,
}: ChatMessageBubbleProps) {
  const { lang, isRTL } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [hovered, setHovered] = useState(false)

  const handleMouseEnter = useCallback(() => setHovered(true), [])
  const handleMouseLeave = useCallback(() => setHovered(false), [])
  const handleReply = useCallback(() => onReply(message), [onReply, message])
  const handleForward = useCallback(() => onForward(message), [onForward, message])
  const handleDelete = useCallback(() => onDelete(message.id), [onDelete, message.id])
  const handleTogglePin = useCallback(
    () => onTogglePin(message.id, !message.isPinned),
    [onTogglePin, message.id, message.isPinned],
  )

  const bubbleStyle = useMemo<React.CSSProperties>(() => {
    if (isHighlightedAsReplyTarget) {
      return {
        background: isDark ? `${REPLY_HIGHLIGHT_COLOR}22` : `${REPLY_HIGHLIGHT_COLOR}18`,
        border: `1px solid ${REPLY_HIGHLIGHT_COLOR}60`,
      }
    }
    return {
      background: isOwn
        ? isDark ? 'rgba(69,132,130,0.16)' : 'rgba(69,132,130,0.10)'
        : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      border: `1px solid ${isOwn ? 'rgba(69,132,130,0.25)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
    }
  }, [isOwn, isDark, isHighlightedAsReplyTarget])

  const tx = useMemo(() => ({
    deleted: lang === 'ar' ? 'تم حذف هذه الرسالة' : 'This message was deleted',
    edited: lang === 'ar' ? '(معدّلة)' : '(edited)',
    forwardedFrom: lang === 'ar' ? 'إعادة توجيه من' : 'Forwarded from',
    pinned: lang === 'ar' ? 'مثبّتة' : 'Pinned',
  }), [lang])

  if (message.isDeleted) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 opacity-50 italic text-[11px]"
        style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
        {tx.deleted}
      </div>
    )
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex gap-2.5 px-3 py-2 group"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <Avatar
        avatarUrl={message.senderAvatarUrl}
        initials={message.senderInitials}
        name={message.senderName}
        size={32}
        color={message.senderColor}
        className="text-white font-bold shrink-0 mt-0.5"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span
            className="text-[12.5px] font-bold"
            style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}
          >
            {message.senderName}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>
            {formatRelativeTime(message.createdAt, lang)}
          </span>
          {message.editedAt && (
            <span className="text-[9px] italic" style={{ color: 'var(--foreground-muted)' }}>
              {tx.edited}
            </span>
          )}
          {message.isPinned && (
            <Pin size={11} style={{ color: '#458482' }} />
          )}
        </div>

        {message.forwardedFrom && (
          <div className="flex items-center gap-1.5 mb-1 text-[10px]" style={{ color: 'var(--foreground-muted)' }}>
            <Forward size={11} />
            <span>{tx.forwardedFrom} {message.forwardedFrom.senderName} · {message.forwardedFrom.channelName}</span>
          </div>
        )}

        {message.replyTo && (
          <div
            className="flex items-center gap-2 mb-1.5 px-2.5 py-1.5 rounded-lg text-[11px]"
            style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              borderInlineStart: `2px solid ${REPLY_HIGHLIGHT_COLOR}`,
              color: 'var(--foreground-muted)',
            }}
          >
            <span className="font-bold">{message.replyTo.senderName}</span>
            <span className="truncate">{message.replyTo.content}</span>
          </div>
        )}

        <div
          className="inline-block px-3 py-2 rounded-xl text-[13px] leading-relaxed max-w-full break-words"
          style={{ ...bubbleStyle, color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
        >
          {message.content}
        </div>
      </div>

      {/* شريط أدوات يظهر عند الـ hover */}
      {hovered && (
        <div
          className="absolute -top-2 flex items-center gap-0.5 rounded-lg px-1 py-1 shadow-md"
          style={{
            [isRTL ? 'left' : 'right']: '40px',
            background: isDark ? '#161b22' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          }}
        >
          <button type="button" onClick={handleReply} className="p-1.5 rounded-md"
            style={{ color: 'var(--foreground-muted)', cursor: 'pointer' }} title={lang === 'ar' ? 'رد' : 'Reply'}>
            <CornerUpLeft size={13} />
          </button>
          <button type="button" onClick={handleForward} className="p-1.5 rounded-md"
            style={{ color: 'var(--foreground-muted)', cursor: 'pointer' }} title={lang === 'ar' ? 'إعادة توجيه' : 'Forward'}>
            <Forward size={13} />
          </button>
          {canPin && (
            <button type="button" onClick={handleTogglePin} className="p-1.5 rounded-md"
              style={{ color: message.isPinned ? '#458482' : 'var(--foreground-muted)', cursor: 'pointer' }}
              title={tx.pinned}>
              <Pin size={13} />
            </button>
          )}
          {(isOwn || canDeleteOthers) && (
            <button type="button" onClick={handleDelete} className="p-1.5 rounded-md"
              style={{ color: '#ef4444', cursor: 'pointer' }} title={lang === 'ar' ? 'حذف' : 'Delete'}>
              <Trash2 size={13} />
            </button>
          )}
          <button type="button" className="p-1.5 rounded-md"
            style={{ color: 'var(--foreground-muted)', cursor: 'pointer' }} title={lang === 'ar' ? 'المزيد' : 'More'}>
            <MoreHorizontal size={13} />
          </button>
        </div>
      )}
    </m.div>
  )
})

export default ChatMessageBubble