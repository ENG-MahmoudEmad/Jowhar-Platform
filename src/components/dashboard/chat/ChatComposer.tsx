// src/components/dashboard/chat/ChatComposer.tsx
"use client"

import React, { memo, useCallback, useState, useRef, useEffect } from 'react'
import { Send, X, CornerUpLeft } from 'lucide-react'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'
import type { ChatMessageData } from './ChatMessageBubble'

interface ChatComposerProps {
  replyingTo: ChatMessageData | null
  onCancelReply: () => void
  onSend: (content: string, replyToMessageId?: string) => void
}

const LINE_HEIGHT_PX = 20
const MAX_LINES = 12
const MAX_HEIGHT_PX = LINE_HEIGHT_PX * MAX_LINES

function ChatComposer({ replyingTo, onCancelReply, onSend }: ChatComposerProps) {
  const { lang, isRTL } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // إعادة حساب ارتفاع الصندوق تلقائياً مع كل تغيير نص، لحد 12 سطر
  // (زي تيليجرام) وبعدها يصير scroll داخلي بدل ما يكبر أكتر.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
  }, [])

  const handleSubmit = useCallback(() => {
    if (!value.trim()) return
    onSend(value.trim(), replyingTo?.id)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [value, replyingTo, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  return (
    <div
      className="shrink-0 px-4 py-3"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
    >
      {replyingTo && (
        <div
          className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg text-[11px]"
          style={{ background: isDark ? 'rgba(69,132,130,0.12)' : 'rgba(69,132,130,0.08)', color: 'var(--foreground-muted)' }}
        >
          <CornerUpLeft size={12} style={{ color: '#458482' }} />
          <span className="flex-1 truncate">
            {lang === 'ar' ? 'رد على' : 'Replying to'} <strong>{replyingTo.senderName}</strong>
          </span>
          <button type="button" onClick={onCancelReply} style={{ cursor: 'pointer', color: 'var(--foreground-muted)' }}>
            <X size={13} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={lang === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
          className="flex-1 resize-none rounded-xl px-3.5 py-2.5 text-[13px] outline-none overflow-y-auto custom-scrollbar"
          style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            color: 'var(--foreground)',
            fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            lineHeight: `${LINE_HEIGHT_PX}px`,
            maxHeight: `${MAX_HEIGHT_PX}px`,
          }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: value.trim() ? 'linear-gradient(135deg, #458482, #458482cc)' : 'var(--hover-bg)',
            color: '#ffffff',
            cursor: value.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          <Send size={16} style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }} />
        </button>
      </div>
    </div>
  )
}

export default memo(ChatComposer)