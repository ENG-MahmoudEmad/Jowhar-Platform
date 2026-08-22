// src/components/dashboard/chat/ChatForwardPicker.tsx
"use client"

import React, { memo, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, Hash } from 'lucide-react'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'
import type { ChatChannelSummary } from './ChatChannelList'

interface ChatForwardPickerProps {
  open: boolean
  channels: ChatChannelSummary[]
  excludeChannelId: string | null
  onClose: () => void
  onSelect: (channelId: string) => void
}

function ChatForwardPicker({ open, channels, excludeChannelId, onClose, onSelect }: ChatForwardPickerProps) {
  const { lang, isRTL } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const handleBackdropClick = useCallback(() => onClose(), [onClose])
  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), [])

  const targets = channels.filter((c) => c.id !== excludeChannelId)

  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={handleBackdropClick}
        >
          <m.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ duration: 0.16 }}
            dir={isRTL ? 'rtl' : 'ltr'}
            className="w-full max-w-xs rounded-2xl overflow-hidden"
            style={{ background: isDark ? '#161b22' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
            onClick={stop}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
              <h3 className="text-[13px] font-black" style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                {lang === 'ar' ? 'إعادة توجيه إلى...' : 'Forward to...'}
              </h3>
              <button type="button" onClick={onClose} style={{ cursor: 'pointer', color: 'var(--foreground-muted)' }}>
                <X size={15} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto py-2">
              {targets.length === 0 ? (
                <p className="text-center text-[11px] py-6" style={{ color: 'var(--foreground-muted)' }}>
                  {lang === 'ar' ? 'لا توجد قنوات أخرى' : 'No other channels'}
                </p>
              ) : (
                targets.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-start"
                    style={{ cursor: 'pointer' }}
                  >
                    <Hash size={14} style={{ color: '#458482' }} />
                    <span className="text-[12.5px] font-bold" style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}>
                      {lang === 'ar' ? c.nameAr : c.nameEn}
                    </span>
                  </button>
                ))
              )}
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

export default memo(ChatForwardPicker)