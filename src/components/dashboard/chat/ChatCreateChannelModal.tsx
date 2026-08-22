// src/components/dashboard/chat/ChatCreateChannelModal.tsx
"use client"

import React, { memo, useCallback, useState } from 'react'
import { m } from 'framer-motion'
import { X, Plus, Hash } from 'lucide-react'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'
import ChatMemberPicker, { type RosterMember } from './ChatMemberPicker'
import { createChatChannelAction } from '@/app/(dashboard)/chat/chatActions'
import type { ChatChannelSummary } from './ChatChannelList'

interface ChatCreateChannelModalProps {
  roster: RosterMember[]
  currentUserId: string
  onClose: () => void
  onCreated: (channel: ChatChannelSummary) => void
}

function ChatCreateChannelModal({ roster, currentUserId, onClose, onCreated }: ChatCreateChannelModalProps) {
  const { lang, isRTL } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [nameEn, setNameEn] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggleMember = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const isValid = nameEn.trim().length > 0 && nameAr.trim().length > 0

  const handleCreate = useCallback(async () => {
    if (!isValid || creating) return
    setCreating(true)
    setError(null)
    try {
      const channel = await createChatChannelAction(nameEn.trim(), nameAr.trim(), selectedIds)
      onCreated({
        id: channel.id,
        nameEn: channel.nameEn,
        nameAr: channel.nameAr,
        isArchived: false,
        unreadCount: 0,
        isMuted: false,
        imageUrl: null,
        allowedReactionEmojis: null,
      })
      onClose()
    } catch {
      setError(lang === 'ar' ? 'تعذّر إنشاء القناة، حاول مرة تانية' : 'Could not create the channel, try again')
    } finally {
      setCreating(false)
    }
  }, [isValid, creating, nameEn, nameAr, selectedIds, onCreated, onClose, lang])

  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), [])

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <m.div
        initial={{ scale: 0.95, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        dir={isRTL ? 'rtl' : 'ltr'}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: isDark ? '#161b22' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
        onClick={stop}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <div className="flex items-center gap-2">
            <Hash size={15} style={{ color: '#458482' }} />
            <h3 className="text-[13px] font-black" style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
              {lang === 'ar' ? 'إنشاء قناة جديدة' : 'Create New Channel'}
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ cursor: 'pointer', color: 'var(--foreground-muted)' }}>
            <X size={15} />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="px-3 py-2 rounded-lg text-[11px]" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--foreground-muted)' }}>
              {lang === 'ar' ? 'الاسم بالإنجليزي' : 'English Name'}
            </label>
            <input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Production"
              className="w-full px-3 py-2 rounded-lg text-[12px] outline-none"
              style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--foreground-muted)' }}>
              {lang === 'ar' ? 'الاسم بالعربي' : 'Arabic Name'}
            </label>
            <input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: الإنتاج"
              dir="rtl"
              className="w-full px-3 py-2 rounded-lg text-[12px] outline-none"
              style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, color: 'var(--foreground)', fontFamily: 'var(--font-arabic)' }}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--foreground-muted)' }}>
              {lang === 'ar' ? 'الأعضاء (اختياري بالإضافة لك)' : 'Members (in addition to you)'}
            </label>
            <ChatMemberPicker
              roster={roster}
              excludeIds={[currentUserId]}
              selectedIds={selectedIds}
              onToggle={handleToggleMember}
            />
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={!isValid || creating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold"
            style={{
              background: isValid && !creating ? 'linear-gradient(135deg, #458482, #458482cc)' : 'var(--hover-bg)',
              color: isValid && !creating ? '#ffffff' : 'var(--foreground-muted)',
              cursor: isValid && !creating ? 'pointer' : 'not-allowed',
            }}
          >
            <Plus size={14} />
            {creating ? (lang === 'ar' ? 'جارٍ الإنشاء...' : 'Creating...') : (lang === 'ar' ? 'إنشاء القناة' : 'Create Channel')}
          </button>
        </div>
      </m.div>
    </m.div>
  )
}

export default memo(ChatCreateChannelModal)