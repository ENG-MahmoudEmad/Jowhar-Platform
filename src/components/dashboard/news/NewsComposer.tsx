"use client"

import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ImageIcon, Send, Megaphone, RefreshCw, AlertTriangle } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import type { NewsPost, NewsType } from './NewsFeed'

const TYPE_OPTIONS: { key: Exclude<NewsType, 'all'>; icon: React.ElementType; en: string; ar: string; color: string }[] = [
  { key: 'announcement', icon: Megaphone,     en: 'Announcement', ar: 'إعلان',  color: '#3b82f6' },
  { key: 'update',       icon: RefreshCw,     en: 'Update',       ar: 'تحديث', color: '#a855f7' },
  { key: 'alert',        icon: AlertTriangle, en: 'Alert',        ar: 'تنبيه', color: '#ef4444' },
]

interface NewsComposerProps {
  open:    boolean
  onClose: () => void
  onPost:  (post: NewsPost) => void
}

export default function NewsComposer({ open, onClose, onPost }: NewsComposerProps) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  const [type,       setType]       = useState<Exclude<NewsType, 'all'>>('announcement')
  const [titleEn,    setTitleEn]    = useState('')
  const [titleAr,    setTitleAr]    = useState('')
  const [body,       setBody]       = useState('')
  const [image,      setImage]      = useState<string | null>(null)
  const [imageUrl,   setImageUrl]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  const bg       = isDark ? 'var(--card)'         : '#ffffff'
  const border   = isDark ? 'var(--card-border)'  : 'rgba(0,0,0,0.08)'
  const divider  = isDark ? 'var(--divider)'      : 'rgba(0,0,0,0.06)'
  const inputBg  = isDark ? 'var(--input-bg)'     : '#f9f9f3'
  const inputBdr = isDark ? 'var(--input-border)' : 'rgba(0,0,0,0.09)'
  const textMain = 'var(--foreground)'
  const textMuted= 'var(--foreground-muted)'

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setImage(ev.target?.result as string); setImageUrl('') }
    reader.readAsDataURL(file)
  }, [])

  const handleUrlBlur = () => {
    if (imageUrl.startsWith('http')) setImage(imageUrl)
  }

  const reset = () => {
    setType('announcement'); setTitleEn(''); setTitleAr('')
    setBody(''); setImage(null); setImageUrl(''); setSubmitting(false)
  }

  const canSubmit = titleEn.trim() && titleAr.trim() && body.trim()

  const handleSubmit = () => {
    if (!canSubmit) return
    setSubmitting(true)
    setTimeout(() => {
      onPost({
        id:          Date.now(),
        type,
        title:       titleEn.trim(),
        titleAr:     titleAr.trim(),
        body:        body.trim(),
        image:       image || undefined,
        author:      'Studio Admin',
        authorAr:    'إدارة الاستوديو',
        avatar:      'SA',
        avatarColor: '#458482',
        timestamp:   'Just now',
        likes:       0,
      })
      reset()
      onClose()
    }, 600)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: inputBg, border: `1px solid ${inputBdr}`,
    borderRadius: '12px', padding: '9px 12px', fontSize: '12px',
    color: textMain, outline: 'none', fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: textMuted, marginBottom: '6px', display: 'block',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }

  const tx = {
    heading:   lang === 'ar' ? 'إضافة إعلان جديد'  : 'New Announcement',
    postType:  lang === 'ar' ? 'نوع الإعلان'        : 'Post type',
    titleEn:   lang === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)',
    titleAr:   lang === 'ar' ? 'العنوان (عربي)'     : 'Title (Arabic)',
    body:      lang === 'ar' ? 'المحتوى'            : 'Content',
    bodyPh:    lang === 'ar' ? 'اكتب محتوى الإعلان هنا...' : 'Write the announcement content here...',
    photo:     lang === 'ar' ? 'صورة الغلاف (اختياري)' : 'Cover image (optional)',
    upload:    lang === 'ar' ? 'رفع من الجهاز'     : 'Upload from device',
    orUrl:     lang === 'ar' ? 'أو الصق رابطًا'    : 'Or paste a URL',
    publish:   lang === 'ar' ? 'نشر الإعلان'        : 'Publish',
    publishing:lang === 'ar' ? 'جارٍ النشر...'     : 'Publishing...',
    required:  lang === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields are required',
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            key="composer"
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            dir={isRTL ? 'rtl' : 'ltr'}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{ background: bg, border: `1px solid ${border}`, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
              style={{ background: bg, borderBottom: `1px solid ${divider}` }}
            >
              <h2 className="text-sm font-black uppercase tracking-widest" style={{
                color: textMain,
                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
              }}>
                {tx.heading}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                style={{ color: textMuted, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* Type */}
              <div>
                <label style={labelStyle}>{tx.postType}</label>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map(t => {
                    const Ic = t.icon
                    const active = type === t.key
                    return (
                      <button
                        key={t.key}
                        onClick={() => setType(t.key)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all"
                        style={{
                          background: active ? `${t.color}18` : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                          color:      active ? t.color : textMuted,
                          border:     `1px solid ${active ? `${t.color}40` : inputBdr}`,
                          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                        }}
                      >
                        <Ic className="w-3.5 h-3.5" />
                        {lang === 'ar' ? t.ar : t.en}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>{tx.titleEn}</label>
                  <input
                    style={{ ...inputStyle, direction: 'ltr' }}
                    placeholder="Post title in English"
                    value={titleEn}
                    onChange={e => setTitleEn(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontFamily: 'var(--font-arabic)' }}>{tx.titleAr}</label>
                  <input
                    style={{ ...inputStyle, direction: 'rtl', fontFamily: 'var(--font-arabic)' }}
                    placeholder="عنوان المنشور بالعربي"
                    value={titleAr}
                    onChange={e => setTitleAr(e.target.value)}
                  />
                </div>
              </div>

              {/* Body — single field */}
              <div>
                <label style={labelStyle}>{tx.body}</label>
                <textarea
                  rows={5}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder={tx.bodyPh}
                  style={{ ...inputStyle, borderRadius: '12px', resize: 'none', lineHeight: '1.7' }}
                />
              </div>

              {/* Image */}
              <div>
                <label style={labelStyle}>{tx.photo}</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold cursor-pointer"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        color: textMuted, border: `1px solid ${inputBdr}`,
                        fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                      }}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      {tx.upload}
                    </button>
                    {image && (
                      <button
                        onClick={() => { setImage(null); setImageUrl('') }}
                        className="px-3 py-2 rounded-xl cursor-pointer"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                  <input
                    style={{ ...inputStyle, direction: 'ltr', fontSize: '11px' }}
                    placeholder={tx.orUrl}
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    onBlur={handleUrlBlur}
                  />
                  {image && (
                    <div style={{ height: '90px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${inputBdr}` }}>
                      <img src={image} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ height: '1px', background: divider }} />

              {/* Submit */}
              <div className="flex items-center justify-between gap-3">
                {!canSubmit && (
                  <p className="text-[10px]" style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                    {tx.required}
                  </p>
                )}
                <div className="flex-1" />
                <motion.button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[12px] font-bold cursor-pointer"
                  style={{
                    background: canSubmit ? '#458482' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                    color:      canSubmit ? '#ffffff'  : textMuted,
                    opacity:    submitting ? 0.7 : 1,
                    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                    border: 'none',
                  }}
                >
                  {submitting
                    ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw className="w-3.5 h-3.5" /></motion.div>{tx.publishing}</>
                    : <><Send className="w-3.5 h-3.5" />{tx.publish}</>
                  }
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}