// src/components/dashboard/chat/ChatChannelSettings.tsx
"use client"

import React, { memo, useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import { m, AnimatePresence } from 'framer-motion'
import { X, Upload, Plus, Settings } from 'lucide-react'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'
import {
  uploadChatChannelImageAction,
  updateChatChannelEmojiWhitelistAction,
} from '@/app/(dashboard)/chat/chatActions'

// نفس المجموعة الافتراضية بالواجهة — الشيف أدمن بيقدر يبدّلها بالكامل
const DEFAULT_EMOJIS = ['👍', '❤️', '🔥', '🎉', '😁', '😢', '👏', '🤔']

interface ChatChannelSettingsProps {
  channelId: string
  channelName: string
  currentImageUrl: string | null
  currentAllowedEmojis: string[] | null
  onClose: () => void
  onUpdated: (patch: { imageUrl?: string; allowedReactionEmojis?: string[] }) => void
}

function ChatChannelSettings({
  channelId,
  channelName,
  currentImageUrl,
  currentAllowedEmojis,
  onClose,
  onUpdated,
}: ChatChannelSettingsProps) {
  const { lang, isRTL } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [imageUrl, setImageUrl] = useState(currentImageUrl)
  const [uploading, setUploading] = useState(false)
  const [emojis, setEmojis] = useState<string[]>(currentAllowedEmojis ?? DEFAULT_EMOJIS)
  const [newEmoji, setNewEmoji] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChooseFile = useCallback(() => fileInputRef.current?.click(), [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return

      setUploading(true)
      try {
        const url = await uploadChatChannelImageAction(channelId, file)
        setImageUrl(url)
        onUpdated({ imageUrl: url })
      } catch {
        // best-effort — الفشل ما بيغيّر شي بالواجهة
      } finally {
        setUploading(false)
      }
    },
    [channelId, onUpdated],
  )

  const handleAddEmoji = useCallback(() => {
    const trimmed = newEmoji.trim()
    if (!trimmed || emojis.includes(trimmed) || emojis.length >= 20) return
    setEmojis((prev) => [...prev, trimmed])
    setNewEmoji('')
  }, [newEmoji, emojis])

  const handleRemoveEmoji = useCallback((emoji: string) => {
    setEmojis((prev) => prev.filter((e) => e !== emoji))
  }, [])

  const handleSaveEmojis = useCallback(async () => {
    setSaving(true)
    try {
      await updateChatChannelEmojiWhitelistAction(channelId, emojis)
      onUpdated({ allowedReactionEmojis: emojis })
    } finally {
      setSaving(false)
    }
  }, [channelId, emojis, onUpdated])

  return (
    <AnimatePresence>
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
          exit={{ scale: 0.95, y: 12, opacity: 0 }}
          dir={isRTL ? 'rtl' : 'ltr'}
          className="w-full max-w-sm rounded-2xl overflow-hidden"
          style={{ background: isDark ? '#161b22' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
            <div className="flex items-center gap-2">
              <Settings size={15} style={{ color: '#458482' }} />
              <h3 className="text-[13px] font-black" style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                {channelName}
              </h3>
            </div>
            <button type="button" onClick={onClose} style={{ cursor: 'pointer', color: 'var(--foreground-muted)' }}>
              <X size={15} />
            </button>
          </div>

          <div className="p-4 space-y-5">
            {/* صورة القناة */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--foreground-muted)' }}>
                {lang === 'ar' ? 'صورة القناة' : 'Channel Image'}
              </label>
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ background: 'rgba(69,132,130,0.12)' }}>
                  {imageUrl && <Image src={imageUrl} alt="" fill sizes="56px" className="object-cover" unoptimized />}
                </div>
                <button
                  type="button"
                  onClick={handleChooseFile}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold"
                  style={{ background: 'rgba(69,132,130,0.14)', color: '#458482', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
                >
                  <Upload size={13} />
                  {uploading ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...') : (lang === 'ar' ? 'رفع صورة' : 'Upload Image')}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>

            {/* قائمة الإيموجي المسموحة */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--foreground-muted)' }}>
                {lang === 'ar' ? 'الإيموجي المسموحة للتفاعل' : 'Allowed Reaction Emojis'}
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleRemoveEmoji(emoji)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[13px]"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', cursor: 'pointer' }}
                    title={lang === 'ar' ? 'اضغط للحذف' : 'Click to remove'}
                  >
                    {emoji}
                    <X size={10} style={{ color: 'var(--foreground-muted)' }} />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  placeholder="🎬"
                  className="w-16 px-2 py-1.5 rounded-lg text-center text-[15px] outline-none"
                  style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
                />
                <button
                  type="button"
                  onClick={handleAddEmoji}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
                  style={{ background: 'rgba(69,132,130,0.14)', color: '#458482', cursor: 'pointer' }}
                >
                  <Plus size={12} />
                  {lang === 'ar' ? 'إضافة' : 'Add'}
                </button>
              </div>
              <p className="text-[9.5px] mt-2" style={{ color: 'var(--foreground-muted)' }}>
                {lang === 'ar'
                  ? 'الأعضاء بيقدروا يتفاعلوا بس بهاي الإيموجي بهاي القناة.'
                  : 'Members can only react with these emojis in this channel.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveEmojis}
              disabled={saving}
              className="w-full py-2.5 rounded-xl text-[12px] font-bold"
              style={{
                background: 'linear-gradient(135deg, #458482, #458482cc)',
                color: '#ffffff',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? (lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ' : 'Save')}
            </button>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  )
}

export default memo(ChatChannelSettings)