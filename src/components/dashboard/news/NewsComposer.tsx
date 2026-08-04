"use client"

import React, { useState, useRef, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ImageIcon, Send, Megaphone, RefreshCw, AlertTriangle, Bold, Italic, List, Smile, Calendar } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { createClient } from '@/lib/supabase/client'
import { createNewsPost } from '@/app/(dashboard)/news/newsActions'
import type { NewsType, NewsPostData, CurrentUserSummary } from './NewsFeed'

const EMOJI_PRESET = ['😀', '🎉', '✅', '⚠️', '📢', '🔥', '💡', '👍', '❤️', '🚀', '📌', '🙏', '👏', '💯', '🎯', '📅']

const TYPE_OPTIONS: { key: Exclude<NewsType, 'all'>; icon: React.ElementType; en: string; ar: string; color: string }[] = [
  { key: 'announcement', icon: Megaphone,     en: 'Announcement', ar: 'إعلان',  color: '#3b82f6' },
  { key: 'update',       icon: RefreshCw,     en: 'Update',       ar: 'تحديث', color: '#a855f7' },
  { key: 'alert',        icon: AlertTriangle, en: 'Alert',        ar: 'تنبيه', color: '#ef4444' },
]

const MAX_IMAGE_MB = 5

const BACKDROP_STYLE: React.CSSProperties = { background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }
const BACKDROP_TRANSITION = { duration: 0.2 }
const COMPOSER_TRANSITION = { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }
const SUBMIT_TAP = { scale: 0.97 }
const SPINNER_ANIM = { rotate: 360 }
const SPINNER_TRANSITION = { repeat: Infinity, duration: 1, ease: 'linear' as const }

const stopPropagation = (e: React.MouseEvent) => e.stopPropagation()

interface NewsComposerProps {
  open:    boolean
  onClose: () => void
  onPost:  (post: NewsPostData) => void
  currentUser: CurrentUserSummary
}

const TypeOptionButton = memo(function TypeOptionButton({
  option, active, isDark, inputBdr, textMuted, lang, onSelect,
}: {
  option: typeof TYPE_OPTIONS[number]
  active: boolean
  isDark: boolean
  inputBdr: string
  textMuted: string
  lang: string
  onSelect: (key: Exclude<NewsType, 'all'>) => void
}) {
  const Ic = option.icon
  const handleClick = useCallback(() => onSelect(option.key), [onSelect, option.key])

  const style = useMemo(() => ({
    background: active ? `${option.color}18` : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
    color:      active ? option.color : textMuted,
    border:     `1px solid ${active ? `${option.color}40` : inputBdr}`,
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [active, isDark, option.color, textMuted, inputBdr, lang])

  return (
    <button
      onClick={handleClick}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all"
      style={style}
    >
      <Ic className="w-3.5 h-3.5" />
      {lang === 'ar' ? option.ar : option.en}
    </button>
  )
})

function NewsComposer({ open, onClose, onPost, currentUser }: NewsComposerProps) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  const [type,       setType]       = useState<Exclude<NewsType, 'all'>>('announcement')
  const [titleEn,    setTitleEn]    = useState('')
  const [titleAr,    setTitleAr]    = useState('')
  const [body,       setBody]       = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null) // local preview only (blob URL or pasted URL)
  const [imageFile,  setImageFile]  = useState<File | null>(null)
  const [imageUrl,   setImageUrl]   = useState('')
  const [publishAt,  setPublishAt]  = useState('') // datetime-local string, فاضي = ينشر فورًا
  const [expiresAt,  setExpiresAt]  = useState('') // datetime-local string, فاضي = ما بينتهي
  const [showEmoji,  setShowEmoji]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const colors = useMemo(() => ({
    bg:       isDark ? 'var(--card)'         : '#ffffff',
    border:   isDark ? 'var(--card-border)'  : 'rgba(0,0,0,0.08)',
    divider:  isDark ? 'var(--divider)'      : 'rgba(0,0,0,0.06)',
    inputBg:  isDark ? 'var(--input-bg)'     : '#f9f9f3',
    inputBdr: isDark ? 'var(--input-border)' : 'rgba(0,0,0,0.09)',
  }), [isDark])
  const textMain = 'var(--foreground)'
  const textMuted= 'var(--foreground-muted)'

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setUploadError(lang === 'ar' ? `الصورة أكبر من ${MAX_IMAGE_MB} ميغا` : `Image is larger than ${MAX_IMAGE_MB}MB`)
      return
    }

    setImageFile(file)
    setImageUrl('')
    // معاينة فورية محليًا بس (blob URL) — الرفع الحقيقي لـ Storage بيصير وقت النشر.
    setImagePreview(URL.createObjectURL(file))
  }, [lang])

  const handleUrlBlur = useCallback(() => {
    setImageUrl(current => {
      if (current.startsWith('http')) {
        setImageFile(null)
        setImagePreview(current)
      }
      return current
    })
  }, [])

  const reset = useCallback(() => {
    setType('announcement'); setTitleEn(''); setTitleAr('')
    setBody(''); setImageFile(null); setImagePreview(null); setImageUrl('')
    setPublishAt(''); setExpiresAt(''); setShowEmoji(false)
    setSubmitting(false); setUploadError(null)
  }, [])

  /**
   * أزرار التنسيق بتحيط النص المحدد برموز (**bold**، *italic*) بدل محرر
   * معقّد — نفس أسلوب GitHub/Slack. الرموز بتتحوّل لتنسيق حقيقي وقت
   * العرض عبر parseNewsMarkdown (شوف NewsCard/NewsModal).
   */
  const wrapSelection = useCallback((marker: string) => {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = body.slice(start, end)
    const newText = body.slice(0, start) + marker + selected + marker + body.slice(end)
    setBody(newText)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + marker.length, start + marker.length + selected.length)
    })
  }, [body])

  const handleBold = useCallback(() => wrapSelection('**'), [wrapSelection])
  const handleItalic = useCallback(() => wrapSelection('*'), [wrapSelection])

  const handleBullet = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart
    const lineStart = body.lastIndexOf('\n', start - 1) + 1
    const newText = body.slice(0, lineStart) + '- ' + body.slice(lineStart)
    setBody(newText)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + 2, start + 2)
    })
  }, [body])

  const handleInsertEmoji = useCallback((emoji: string) => {
    const el = bodyRef.current
    const start = el?.selectionStart ?? body.length
    const end = el?.selectionEnd ?? body.length
    const newText = body.slice(0, start) + emoji + body.slice(end)
    setBody(newText)
    setShowEmoji(false)
    requestAnimationFrame(() => {
      el?.focus()
      const pos = start + emoji.length
      el?.setSelectionRange(pos, pos)
    })
  }, [body])

  const canSubmit = !!(titleEn.trim() && titleAr.trim() && body.trim())

  const handleSubmit = useCallback(async () => {
    if (!(titleEn.trim() && titleAr.trim() && body.trim())) return

    const publishAtIso = publishAt ? new Date(publishAt).toISOString() : null
    const expiresAtIso = expiresAt ? new Date(expiresAt).toISOString() : null

    if (publishAtIso && expiresAtIso && new Date(expiresAtIso) <= new Date(publishAtIso)) {
      setUploadError(lang === 'ar' ? 'تاريخ الانتهاء لازم يكون بعد تاريخ النشر' : 'Expiry date must be after the publish date')
      return
    }

    setSubmitting(true)
    setUploadError(null)

    try {
      let finalImageUrl: string | null = null

      if (imageFile) {
        // رفع حقيقي لـ Supabase Storage — مش base64 جوا الداتابيز.
        const supabase = createClient()
        const ext = imageFile.name.split('.').pop() ?? 'jpg'
        const path = `${crypto.randomUUID()}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('news-images')
          .upload(path, imageFile, { cacheControl: '3600', upsert: false })

        if (uploadErr) throw new Error('upload_failed')

        const { data: publicUrlData } = supabase.storage
          .from('news-images')
          .getPublicUrl(path)

        finalImageUrl = publicUrlData.publicUrl
      } else if (imageUrl.startsWith('http')) {
        finalImageUrl = imageUrl
      }

      const { id } = await createNewsPost({
        type,
        titleEn: titleEn.trim(),
        titleAr: titleAr.trim(),
        body: body.trim(),
        imageUrl: finalImageUrl,
        publishAt: publishAtIso,
        expiresAt: expiresAtIso,
      })

      onPost({
        id,
        type,
        titleEn: titleEn.trim(),
        titleAr: titleAr.trim(),
        body: body.trim(),
        imageUrl: finalImageUrl,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorInitials: currentUser.initials,
        authorColor: currentUser.color,
        authorAvatarUrl: currentUser.avatarUrl,
        createdAt: new Date().toISOString(),
        publishAt: publishAtIso,
        expiresAt: expiresAtIso,
        isUpcoming: !!publishAtIso && new Date(publishAtIso) > new Date(),
        likesCount: 0,
        likedByMe: false,
      })

      reset()
      onClose()
    } catch {
      setUploadError(lang === 'ar' ? 'تعذّر النشر — حاول من جديد.' : 'Could not publish — try again.')
      setSubmitting(false)
    }
  }, [titleEn, titleAr, body, type, imageFile, imageUrl, publishAt, expiresAt, onPost, reset, onClose, currentUser, lang])

  const handleFileBtnClick = useCallback(() => fileRef.current?.click(), [])
  const handleRemoveImage = useCallback(() => { setImageFile(null); setImagePreview(null); setImageUrl('') }, [])
  const handleTitleEnChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitleEn(e.target.value), [])
  const handleTitleArChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitleAr(e.target.value), [])
  const handleBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value), [])
  const handleImageUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setImageUrl(e.target.value), [])

  const inputStyle = useMemo<React.CSSProperties>(() => ({
    width: '100%', background: colors.inputBg, border: `1px solid ${colors.inputBdr}`,
    borderRadius: '12px', padding: '9px 12px', fontSize: '12px',
    color: textMain, outline: 'none', fontFamily: 'inherit',
  }), [colors.inputBg, colors.inputBdr])

  const labelStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: textMuted, marginBottom: '6px', display: 'block',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [lang])

  const arLabelStyle = useMemo<React.CSSProperties>(() => ({
    ...labelStyle, fontFamily: 'var(--font-arabic)',
  }), [labelStyle])

  const tx = useMemo(() => ({
    heading:   lang === 'ar' ? 'إضافة إعلان جديد'  : 'New Announcement',
    postType:  lang === 'ar' ? 'نوع الإعلان'        : 'Post type',
    titleEn:   lang === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)',
    titleAr:   lang === 'ar' ? 'العنوان (عربي)'     : 'Title (Arabic)',
    body:      lang === 'ar' ? 'المحتوى'            : 'Content',
    bodyPh:    lang === 'ar' ? 'اكتب محتوى الإعلان هنا...' : 'Write the announcement content here...',
    photo:     lang === 'ar' ? 'صورة الغلاف (اختياري)' : 'Cover image (optional)',
    upload:    lang === 'ar' ? 'رفع من الجهاز'     : 'Upload from device',
    orUrl:     lang === 'ar' ? 'أو الصق رابطًا'    : 'Or paste a URL',
    publishAt:      lang === 'ar' ? 'جدولة النشر (اختياري)' : 'Schedule publish (optional)',
    publishAtHint:  lang === 'ar' ? 'فاضي = ينشر فورًا' : 'Empty = publish immediately',
    expiresAt:      lang === 'ar' ? 'تاريخ الانتهاء (اختياري)' : 'Expiry date (optional)',
    expiresAtHint:  lang === 'ar' ? 'فاضي = ما بينتهي أبدًا' : 'Empty = never expires',
    publish:   lang === 'ar' ? 'نشر الإعلان'        : 'Publish',
    publishing:lang === 'ar' ? 'جارٍ النشر...'     : 'Publishing...',
    required:  lang === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields are required',
  }), [lang])

  const headerStyle = useMemo(() => ({ background: colors.bg, borderBottom: `1px solid ${colors.divider}` }), [colors.bg, colors.divider])
  const composerStyle = useMemo(() => ({ background: colors.bg, border: `1px solid ${colors.border}`, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }), [colors.bg, colors.border])
  const closeBtnStyle = useMemo(() => ({ color: textMuted, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }), [isDark])
  const uploadBtnStyle = useMemo(() => ({
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    color: textMuted, border: `1px solid ${colors.inputBdr}`,
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [isDark, colors.inputBdr, lang])
  const toolbarBtnStyle = useMemo(() => ({
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    color: textMuted, border: `1px solid ${colors.inputBdr}`,
    transition: 'background 0.12s, color 0.12s',
  }), [isDark, colors.inputBdr])
  const titleEnInputStyle = useMemo(() => ({ ...inputStyle, direction: 'ltr' as const }), [inputStyle])
  const titleArInputStyle = useMemo(() => ({ ...inputStyle, direction: 'rtl' as const, fontFamily: 'var(--font-arabic)' }), [inputStyle])
  const bodyInputStyle = useMemo(() => ({ ...inputStyle, borderRadius: '12px', resize: 'none' as const, lineHeight: '1.7' }), [inputStyle])
  const urlInputStyle = useMemo(() => ({ ...inputStyle, direction: 'ltr' as const, fontSize: '11px' }), [inputStyle])
  const imagePreviewStyle = useMemo(() => ({ height: '90px', borderRadius: '12px', overflow: 'hidden' as const, border: `1px solid ${colors.inputBdr}` }), [colors.inputBdr])
  const submitBtnStyle = useMemo(() => ({
    background: canSubmit ? '#458482' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
    color:      canSubmit ? '#ffffff'  : textMuted,
    opacity:    submitting ? 0.7 : 1,
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
    border: 'none',
  }), [canSubmit, isDark, submitting, lang])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={BACKDROP_TRANSITION}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={BACKDROP_STYLE}
          onClick={onClose}
        >
          <motion.div
            key="composer"
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 24 }}
            transition={COMPOSER_TRANSITION}
            onClick={stopPropagation}
            dir={isRTL ? 'rtl' : 'ltr'}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl"
            style={composerStyle}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
              style={headerStyle}
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
                style={closeBtnStyle}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">

              {uploadError && (
                <div className="px-4 py-2 rounded-xl text-[11px] font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  {uploadError}
                </div>
              )}

              {/* Type */}
              <div>
                <label style={labelStyle}>{tx.postType}</label>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map(t => (
                    <TypeOptionButton
                      key={t.key}
                      option={t}
                      active={type === t.key}
                      isDark={isDark}
                      inputBdr={colors.inputBdr}
                      textMuted={textMuted}
                      lang={lang}
                      onSelect={setType}
                    />
                  ))}
                </div>
              </div>

              {/* Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>{tx.titleEn}</label>
                  <input
                    style={titleEnInputStyle}
                    placeholder="Post title in English"
                    value={titleEn}
                    onChange={handleTitleEnChange}
                  />
                </div>
                <div>
                  <label style={arLabelStyle}>{tx.titleAr}</label>
                  <input
                    style={titleArInputStyle}
                    placeholder="عنوان المنشور بالعربي"
                    value={titleAr}
                    onChange={handleTitleArChange}
                  />
                </div>
              </div>

              {/* Body — single field, with a lightweight formatting toolbar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label style={{ ...labelStyle, marginBottom: 0 }}>{tx.body}</label>
                  <div className="flex items-center gap-1 relative">
                    <button
                      type="button"
                      onClick={handleBold}
                      title={lang === 'ar' ? 'عريض' : 'Bold'}
                      className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                      style={toolbarBtnStyle}
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleItalic}
                      title={lang === 'ar' ? 'مائل' : 'Italic'}
                      className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                      style={toolbarBtnStyle}
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleBullet}
                      title={lang === 'ar' ? 'نقطة' : 'Bullet'}
                      className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                      style={toolbarBtnStyle}
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmoji(v => !v)}
                      title={lang === 'ar' ? 'إيموجي' : 'Emoji'}
                      className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                      style={toolbarBtnStyle}
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>

                    <AnimatePresence>
                      {showEmoji && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.97 }}
                          transition={{ duration: 0.13 }}
                          className="absolute z-20 grid grid-cols-8 gap-1 p-2 rounded-xl"
                          style={{
                            top: 'calc(100% + 6px)',
                            insetInlineEnd: 0,
                            width: 224,
                            background: isDark ? '#161b22' : '#ffffff',
                            border: `1px solid ${colors.inputBdr}`,
                            boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                          }}
                        >
                          {EMOJI_PRESET.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleInsertEmoji(emoji)}
                              className="w-6 h-6 flex items-center justify-center rounded-md text-[15px] cursor-pointer"
                              style={{ transition: 'background 0.1s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <textarea
                  ref={bodyRef}
                  rows={5}
                  value={body}
                  onChange={handleBodyChange}
                  placeholder={tx.bodyPh}
                  style={bodyInputStyle}
                />
                <p className="text-[9px] mt-1" style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                  {lang === 'ar' ? 'حدّد نص واضغط عريض/مائل، أو ابدأ سطر بـ "- " لنقطة' : 'Select text then Bold/Italic, or start a line with "- " for a bullet'}
                </p>
              </div>

              {/* Image */}
              <div>
                <label style={labelStyle}>{tx.photo}</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={handleFileBtnClick}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold cursor-pointer"
                      style={uploadBtnStyle}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      {tx.upload}
                    </button>
                    {imagePreview && (
                      <button
                        onClick={handleRemoveImage}
                        className="px-3 py-2 rounded-xl cursor-pointer"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                  <input
                    style={urlInputStyle}
                    placeholder={tx.orUrl}
                    value={imageUrl}
                    onChange={handleImageUrlChange}
                    onBlur={handleUrlBlur}
                  />
                  {imagePreview && (
                    <div style={imagePreviewStyle}>
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Scheduling — both optional */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {tx.publishAt}
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    value={publishAt}
                    onChange={e => setPublishAt(e.target.value)}
                    style={{ ...inputStyle, direction: 'ltr' as const, colorScheme: isDark ? 'dark' : 'light' }}
                  />
                  <p className="text-[9px] mt-1" style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                    {tx.publishAtHint}
                  </p>
                </div>
                <div>
                  <label style={labelStyle}>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {tx.expiresAt}
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                    style={{ ...inputStyle, direction: 'ltr' as const, colorScheme: isDark ? 'dark' : 'light' }}
                  />
                  <p className="text-[9px] mt-1" style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                    {tx.expiresAtHint}
                  </p>
                </div>
              </div>

              <div style={{ height: '1px', background: colors.divider }} />

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
                  whileTap={SUBMIT_TAP}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[12px] font-bold cursor-pointer"
                  style={submitBtnStyle}
                >
                  {submitting
                    ? <><motion.div animate={SPINNER_ANIM} transition={SPINNER_TRANSITION}><RefreshCw className="w-3.5 h-3.5" /></motion.div>{tx.publishing}</>
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

export default memo(NewsComposer)