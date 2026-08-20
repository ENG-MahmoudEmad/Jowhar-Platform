// src/components/dashboard/chat/ChatChannelList.tsx
"use client"

import React, { memo, useMemo, useCallback } from 'react'
import { m } from 'framer-motion'
import { Hash, Lock } from 'lucide-react'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'

export interface ChatChannelSummary {
  id: string
  nameEn: string
  nameAr: string
  isArchived: boolean
  unreadCount: number
  isMuted: boolean
}

interface ChatChannelListProps {
  channels: ChatChannelSummary[]
  activeChannelId: string | null
  onSelect: (channelId: string) => void
}

const CHANNEL_COLOR = '#458482'

const ChannelRow = memo(function ChannelRow({
  channel,
  isActive,
  onSelect,
}: {
  channel: ChatChannelSummary
  isActive: boolean
  onSelect: (id: string) => void
}) {
  const { lang } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const name = lang === 'ar' ? channel.nameAr : channel.nameEn

  const handleClick = useCallback(() => onSelect(channel.id), [onSelect, channel.id])

  const rowStyle = useMemo<React.CSSProperties>(() => ({
    background: isActive
      ? isDark
        ? `linear-gradient(135deg, ${CHANNEL_COLOR}22, ${CHANNEL_COLOR}12)`
        : `linear-gradient(135deg, ${CHANNEL_COLOR}18, ${CHANNEL_COLOR}08)`
      : 'transparent',
    border: `1px solid ${isActive ? CHANNEL_COLOR + '35' : 'transparent'}`,
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
  }), [isActive, isDark])

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-start"
      style={rowStyle}
    >
      <Hash
        size={15}
        className="shrink-0"
        style={{ color: isActive ? CHANNEL_COLOR : 'var(--foreground-muted)' }}
      />

      <span
        className="flex-1 min-w-0 truncate text-[12.5px] font-bold"
        style={{
          color: isActive ? 'var(--foreground)' : 'var(--foreground-muted)',
          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
        }}
      >
        {name}
      </span>

      {channel.unreadCount > 0 && !channel.isMuted && (
        <span
          className="shrink-0 flex items-center justify-center rounded-full text-[9px] font-black text-white px-1.5 h-[18px] min-w-[18px]"
          style={{ background: '#ef4444' }}
        >
          {channel.unreadCount > 9 ? '9+' : channel.unreadCount}
        </span>
      )}

      {channel.isArchived && (
        <Lock size={11} className="shrink-0" style={{ color: 'var(--foreground-muted)' }} />
      )}
    </button>
  )
})

function ChatChannelList({ channels, activeChannelId, onSelect }: ChatChannelListProps) {
  const { lang, isRTL } = useLang()

  const tx = useMemo(() => ({
    title: lang === 'ar' ? 'القنوات' : 'Channels',
    empty: lang === 'ar' ? 'لا توجد قنوات بعد' : 'No channels yet',
  }), [lang])

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="flex flex-col h-full min-h-0">
      <div className="px-3 py-3 shrink-0">
        <h2
          className="text-[11px] font-black uppercase tracking-widest px-2"
          style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
        >
          {tx.title}
        </h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 space-y-0.5 pb-3">
        {channels.length === 0 ? (
          <p
            className="text-center text-[11px] py-8"
            style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {tx.empty}
          </p>
        ) : (
          channels.map((channel, i) => (
            <m.div
              key={channel.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
            >
              <ChannelRow
                channel={channel}
                isActive={channel.id === activeChannelId}
                onSelect={onSelect}
              />
            </m.div>
          ))
        )}
      </div>
    </div>
  )
}

export default memo(ChatChannelList)