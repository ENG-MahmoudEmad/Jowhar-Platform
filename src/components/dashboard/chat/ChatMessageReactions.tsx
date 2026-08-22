// src/components/dashboard/chat/ChatMessageReactions.tsx
"use client"

import React, { memo, useCallback, useMemo, useState, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { SmilePlus } from 'lucide-react'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'

export interface ReactionSummary {
  emoji: string
  count: number
  reactedByMe: boolean
  reactorNames: string[]
}

interface ChatMessageReactionsProps {
  reactions: ReactionSummary[]
  allowedEmojis: string[]
  onToggle: (emoji: string) => void
}

// نفس المجموعة الأساسية المجانية اللي أطلقها تيليجرام أول مرة — كافية
// جداً لفريق داخلي، وبتقدر توسّعها لاحقاً بسهولة
export const DEFAULT_QUICK_EMOJIS = ['👍', '❤️', '🔥', '🎉', '😁', '😢', '👏', '🤔']

const ReactionChip = memo(function ReactionChip({
  reaction,
  onToggle,
}: {
  reaction: ReactionSummary
  onToggle: (emoji: string) => void
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const handleClick = useCallback(() => onToggle(reaction.emoji), [onToggle, reaction.emoji])

  return (
    <button
      type="button"
      onClick={handleClick}
      title={reaction.reactorNames.join('، ')}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{
        background: reaction.reactedByMe
          ? 'rgba(69,132,130,0.18)'
          : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        border: `1px solid ${reaction.reactedByMe ? 'rgba(69,132,130,0.5)' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        cursor: 'pointer',
        color: reaction.reactedByMe ? '#458482' : 'var(--foreground-muted)',
      }}
    >
      <span>{reaction.emoji}</span>
      <span>{reaction.count}</span>
    </button>
  )
})

function ChatMessageReactions({ reactions, allowedEmojis, onToggle }: ChatMessageReactionsProps) {
  const { isRTL } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [pickerOpen, setPickerOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleTogglePicker = useCallback(() => setPickerOpen((v) => !v), [])
  const handlePick = useCallback(
    (emoji: string) => {
      onToggle(emoji)
      setPickerOpen(false)
    },
    [onToggle],
  )

  const hasReactions = reactions.length > 0

  return (
    <div ref={wrapperRef} className="relative flex items-center flex-wrap gap-1 mt-1">
      {reactions.map((r) => (
        <ReactionChip key={r.emoji} reaction={r} onToggle={onToggle} />
      ))}

      <button
        type="button"
        onClick={handleTogglePicker}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full"
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          color: 'var(--foreground-muted)',
          cursor: 'pointer',
          opacity: hasReactions ? 1 : 0,
        }}
      >
        <SmilePlus size={12} />
      </button>

      <AnimatePresence>
        {pickerOpen && (
          <m.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute z-20 flex items-center gap-1 px-2 py-1.5 rounded-xl"
            style={{
              bottom: '100%',
              marginBottom: 6,
              [isRTL ? 'right' : 'left']: 0,
              background: isDark ? '#161b22' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            }}
          >
            {allowedEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handlePick(emoji)}
                className="w-7 h-7 flex items-center justify-center text-[16px] rounded-lg hover:scale-110"
                style={{ cursor: 'pointer', transition: 'transform 0.1s' }}
              >
                {emoji}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default memo(ChatMessageReactions)