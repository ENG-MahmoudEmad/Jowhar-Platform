"use client"

import React, { useState, useRef, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ImageIcon, Send, Megaphone, RefreshCw, AlertTriangle, Bold, Italic, List, Smile, Calendar, Palette, RectangleHorizontal, RectangleVertical, Square, Move } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { createClient } from '@/lib/supabase/client'
import { createNewsPost } from '@/app/(dashboard)/news/newsActions'
import type { NewsType, NewsPostData, CurrentUserSummary, NewsImageAspect } from './NewsFeed'

const EMOJI_PRESET = ['😀', '🎉', '✅', '⚠️', '📢', '🔥', '💡', '👍', '❤️', '🚀', '📌', '🙏', '👏', '💯', '🎯', '📅']

const COLOR_PRESET = [
  { hex: '#458482', label: 'Teal' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#a855f7', label: 'Purple' },
  { hex: '#ef4444', label: 'Red' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#10b981', label: 'Green' },
  { hex: '#ec4899', label: 'Pink' },
  { hex: '#64748b', label: 'Slate' },
]

const TYPE_OPTIONS: { key: Exclude<NewsType, 'all'>; icon: React.ElementType; en: string; ar: string; color: string }[] = [
  { key: 'announcement', icon: Megaphone,     en: 'Announcement', ar: 'إعلان',  color: '#3b82f6' },
  { key: 'update',       icon: RefreshCw,     en: 'Update',       ar: 'تحديث', color: '#a855f7' },
  { key: 'alert',        icon: AlertTriangle, en: 'Alert',        ar: 'تنبيه', color: '#ef4444' },
]

/** نفس الخريطة المستخدمة بـNewsCard/NewsModal — لازم تضل متطابقة. */
const ASPECT_OPTIONS: { key: NewsImageAspect; icon: React.ElementType; en: string; ar: string; ratio: string }[] = [
  { key: 'landscape', icon: RectangleHorizontal, en: 'Landscape', ar: 'عرضية', ratio: '16 / 9' },
  { key: 'portrait',  icon: RectangleVertical,   en: 'Portrait',  ar: 'طولية', ratio: '3 / 4'  },
  { key: 'square',    icon: Square,              en: 'Square',    ar: 'مربعة', ratio: '1 / 1'  },
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

/** زر اختيار شكل قص الصورة (عرضية/طولية/مربعة). */
const AspectOptionButton = memo(function AspectOptionButton({
  option, active, isDark, inputBdr, textMuted, lang, onSelect,
}: {
  option: typeof ASPECT_OPTIONS[number]
  active: boolean
  isDark: boolean
  inputBdr: string
  textMuted: string
  lang: string
  onSelect: (key: NewsImageAspect) => void
}) {
  const Ic = option.icon
  const handleClick = useCallback(() => onSelect(option.key), [onSelect, option.key])

  const style = useMemo(() => ({
    background: active ? 'rgba(69,132,130,0.18)' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
    color:      active ? '#458482' : textMuted,
    border:     `1px solid ${active ? 'rgba(69,132,130,0.4)' : inputBdr}`,
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [active, isDark, textMuted, inputBdr, lang])

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all"
      style={style}
    >
      <Ic className="w-4 h-4" />
      {lang === 'ar' ? option.ar : option.en}
    </button>
  )
})

/**
 * معاينة الصورة مع سحب وإفلات حر لتحديد موضع القص — بنفس فكرة أدوات
 * Facebook/Instagram لصورة الغلاف. الصورة معروضة بحجمها الكامل (مش
 * مقصوصة)، والإطار بلون شبه شفاف بيبيّن أي جزء رح يظهر فعليًا بالكارت
 * (نسبة أبعاد aspect ثابتة، بيتحرك بس مكانه داخل الصورة حسب position).
 */
const ImagePositionPicker = memo(function ImagePositionPicker({
  imageUrl, aspect, positionX, positionY, onChange, isDark, lang,
}: {
  imageUrl:  string
  aspect:    NewsImageAspect
  positionX: number
  positionY: number
  onChange:  (x: number, y: number) => void
  isDark:    boolean
  lang:      string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const aspectRatio = useMemo(
    () => ASPECT_OPTIONS.find(a => a.key === aspect)?.ratio ?? '16 / 9',
    [aspect],
  )

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    onChange(Math.round(x), Math.round(y))
  }, [onChange])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
    updateFromPointer(e.clientX, e.clientY)
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
  }, [updateFromPointer])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    updateFromPointer(e.clientX, e.clientY)
  }, [dragging, updateFromPointer])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  const containerStyle = useMemo<React.CSSProperties>(() => ({
    aspectRatio: '16 / 9', // نافذة المعاينة نفسها دايمًا عريضة (مساحة كافية للسحب)، بغض النظر عن الـaspect المختار
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '12px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
    cursor: dragging ? 'grabbing' : 'grab',
    touchAction: 'none',
    userSelect: 'none',
  }), [isDark, dragging])

  const cropOverlayStyle = useMemo<React.CSSProperties>(() => {
    // الإطار (aspect المختار) متمركز أفقيًا داخل نافذة المعاينة، وارتفاعه
    // بيتغيّر حسب النسبة — بيبيّن للناشر أي جزء بالضبط رح يظهر بالكارت.
    return {
      position: 'absolute',
      inset: 0,
      margin: 'auto',
      aspectRatio,
      maxWidth: '100%',
      maxHeight: '100%',
      border: '2px solid #458482',
      boxShadow: '0 0 0 2000px rgba(0,0,0,0.5)',
      pointerEvents: 'none',
    }
  }, [aspectRatio])

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <img
        src={imageUrl}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: `${positionX}% ${positionY}%` }}
      />
      <div style={cropOverlayStyle} />

      {/* مؤشر مركز موضع القص الحالي — تلميح بصري بس */}
      <div
        className="absolute w-3 h-3 rounded-full pointer-events-none"
        style={{
          left: `${positionX}%`,
          top: `${positionY}%`,
          transform: 'translate(-50%, -50%)',
          background: '#458482',
          border: '2px solid #ffffff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        }}
      />

      <div
        className="absolute bottom-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold pointer-events-none"
        style={{
          [/* rtl-safe */ 'insetInlineStart']: '8px',
          background: 'rgba(8,15,18,0.6)',
          color: '#ffffff',
          backdropFilter: 'blur(4px)',
        } as React.CSSProperties}
      >
        <Move className="w-3 h-3" />
        {lang === 'ar' ? 'اسحب لتحديد الموضع' : 'Drag to reposition'}
      </div>
    </div>
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
  const [imageAspect, setImageAspect] = useState<NewsImageAspect>('landscape')
  const [imagePositionX, setImagePositionX] = useState(50)
  const [imagePositionY, setImagePositionY] = useState(50)
  const [publishAt,  setPublishAt]  = useState('') // datetime-local string, فاضي = ينشر فورًا
  const [expiresAt,  setExpiresAt]  = useState('') // datetime-local string, فاضي = ما بينتهي
  const [showEmoji,  setShowEmoji]  = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
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
    setImagePositionX(50)
    setImagePositionY(50)
    // معاينة فورية محليًا بس (blob URL) — الرفع الحقيقي لـ Storage بيصير وقت النشر.
    setImagePreview(URL.createObjectURL(file))
  }, [lang])

  const handleUrlBlur = useCallback(() => {
    setImageUrl(current => {
      if (current.startsWith('http')) {
        setImageFile(null)
        setImagePreview(current)
        setImagePositionX(50)
        setImagePositionY(50)
      }
      return current
    })
  }, [])

  const handlePositionChange = useCallback((x: number, y: number) => {
    setImagePositionX(x)
    setImagePositionY(y)
  }, [])

  const reset = useCallback(() => {
    setType('announcement'); setTitleEn(''); setTitleAr('')
    setBody(''); setImageFile(null); setImagePreview(null); setImageUrl('')
    setImageAspect('landscape'); setImagePositionX(50); setImagePositionY(50)
    setPublishAt(''); setExpiresAt(''); setShowEmoji(false); setShowColorPicker(false)
    setSubmitting(false); setUploadError(null)
  }, [])

  /**
   * أزرار التنسيق بتحيط النص المحدد برموز (**bold**، *italic*) بدل محرر
   * معقّد — نفس أسلوب GitHub/Slack. الرموز بتتحوّل لتنسيق حقيقي وقت
   * العرض عبر parseNewsMarkdown (شوف NewsCard/NewsModal). الروابط
   * (http/https) بتتكشف تلقائيًا من شكلها، بدون أي رمز خاص.
   */
  const wrapSelection = useCallback((before: string, after: string = before) => {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = body.slice(start, end)
    const newText = body.slice(0, start) + before + selected + after + body.slice(end)
    setBody(newText)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }, [body])

  const handleBold = useCallback(() => wrapSelection('**'), [wrapSelection])
  const handleItalic = useCallback(() => wrapSelection('*'), [wrapSelection])
  const handleColor = useCallback((hex: string) => {
    wrapSelection(`[${hex}]`, `[/${hex}]`)
    setShowColorPicker(false)
  }, [wrapSelection])

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
        imageAspect,
        imagePositionX,
        imagePositionY,
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
        imageAspect,
        imagePositionX,
        imagePositionY,
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
  }, [titleEn, titleAr, body, type, imageFile, imageUrl, imageAspect, imagePositionX, imagePositionY, publishAt, expiresAt, onPost, reset, onClose, currentUser, lang])

  const handleFileBtnClick = useCallback(() => fileRef.current?.click(), [])
  const handleRemoveImage = useCallback(() => {
    setImageFile(null); setImagePreview(null); setImageUrl('')
    setImagePositionX(50); setImagePositionY(50)
  }, [])
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
    aspectLabel: lang === 'ar' ? 'شكل الصورة'       : 'Image shape',
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
                      onClick={() => setShowColorPicker(v => !v)}
                      title={lang === 'ar' ? 'لون النص' : 'Text color'}
                      className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer relative"
                      style={toolbarBtnStyle}
                    >
                      <Palette className="w-3.5 h-3.5" />
                    </button>

                    <AnimatePresence>
                      {showColorPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.97 }}
                          transition={{ duration: 0.13 }}
                          className="absolute z-20 grid grid-cols-4 gap-1.5 p-2 rounded-xl"
                          style={{
                            top: 'calc(100% + 6px)',
                            insetInlineEnd: 76,
                            width: 116,
                            background: isDark ? '#161b22' : '#ffffff',
                            border: `1px solid ${colors.inputBdr}`,
                            boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                          }}
                        >
                          {COLOR_PRESET.map(({ hex, label }) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => handleColor(hex)}
                              title={label}
                              className="w-6 h-6 rounded-full cursor-pointer"
                              style={{ background: hex, border: '2px solid rgba(255,255,255,0.15)' }}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

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
                  {lang === 'ar'
                    ? 'حدّد نص واضغط عريض/مائل/لون، أو ابدأ سطر بـ "- " لنقطة. أي رابط (https://...) بيصير قابل للضغط تلقائيًا.'
                    : 'Select text then Bold/Italic/Color, or start a line with "- " for a bullet. Any https:// link becomes clickable automatically.'}
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

                  {/* شكل الصورة — 3 خيارات، تظهر بس لما فيه صورة فعلية */}
                  {imagePreview && (
                    <>
                      <div className="flex gap-2 mt-1">
                        {ASPECT_OPTIONS.map(opt => (
                          <AspectOptionButton
                            key={opt.key}
                            option={opt}
                            active={imageAspect === opt.key}
                            isDark={isDark}
                            inputBdr={colors.inputBdr}
                            textMuted={textMuted}
                            lang={lang}
                            onSelect={setImageAspect}
                          />
                        ))}
                      </div>

                      {/* معاينة قابلة للسحب لتحديد موضع القص */}
                      <ImagePositionPicker
                        imageUrl={imagePreview}
                        aspect={imageAspect}
                        positionX={imagePositionX}
                        positionY={imagePositionY}
                        onChange={handlePositionChange}
                        isDark={isDark}
                        lang={lang}
                      />
                    </>
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