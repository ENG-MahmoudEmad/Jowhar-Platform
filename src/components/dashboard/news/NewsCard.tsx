"use client"

import React, { useState, useMemo, useCallback, memo } from 'react'
import { Heart, Clock, Megaphone, RefreshCw, AlertTriangle, CalendarClock, Trash2, Check, X as XIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import Avatar from '@/components/ui/Avatar'
import { stripNewsMarkdown } from '@/lib/parseNewsMarkdown'
import type { NewsPost } from './NewsFeed'

export type { NewsPost }

const TYPE_META = {
  announcement: { color: '#3b82f6', icon: Megaphone,    en: 'Announcement', ar: 'إعلان'  },
  update:       { color: '#a855f7', icon: RefreshCw,     en: 'Update',       ar: 'تحديث' },
  alert:        { color: '#ef4444', icon: AlertTriangle, en: 'Alert',        ar: 'تنبيه' },
}

const PREVIEW_CHARS = 120

const CARD_HOVER_LIGHT = { y: -2, borderColor: 'rgba(0,0,0,0.14)' }
const CARD_HOVER_DARK  = { y: -2, borderColor: 'rgba(255,255,255,0.12)' }
const CARD_TRANSITION  = { duration: 0.2 }

interface NewsCardProps {
  post:    NewsPost
  liked:   boolean
  likes:   number
  isAdmin: boolean
  onLike:  () => void
  onClick: (post: NewsPost) => void
  onDelete: () => void
}

function NewsCard({ post, liked, likes, isAdmin, onLike, onClick, onDelete }: NewsCardProps) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const themeColors = useMemo(() => ({
    bg:        isDark ? 'var(--card)'        : '#ffffff',
    border:    isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)',
    divider:   isDark ? 'var(--divider)'     : 'rgba(0,0,0,0.06)',
  }), [isDark])
  const textMuted = 'var(--foreground-muted)'

  const meta   = TYPE_META[post.type]
  const Icon   = meta.icon
  const title  = lang === 'ar' ? post.titleAr : post.title
  const author = lang === 'ar' ? post.authorAr : post.author

  const { preview, hasMore } = useMemo(() => {
    const plain = stripNewsMarkdown(post.body)
    const over = plain.length > PREVIEW_CHARS
    return {
      preview: over ? plain.slice(0, PREVIEW_CHARS) + '…' : plain,
      hasMore: over,
    }
  }, [post.body])

  const handleClick = useCallback(() => onClick(post), [onClick, post])

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onLike()
  }, [onLike])

  const handleStartDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmingDelete(true)
  }, [])

  const handleCancelDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmingDelete(false)
  }, [])

  const handleConfirmDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }, [onDelete])

  const imageStyle = useMemo(() => ({
    filter: isDark ? 'brightness(0.85)' : 'none',
  }), [isDark])

  const badgeStyle = useMemo(() => ({
    background: `${meta.color}18`,
    color: meta.color,
  }), [meta.color])

  const likeBtnStyle = useMemo(() => ({
    background: liked ? 'rgba(239,68,68,0.12)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
    color:      liked ? '#ef4444' : textMuted,
    border:     liked ? '1px solid rgba(239,68,68,0.25)' : '1px solid transparent',
    transition: 'all 0.2s ease',
  }), [liked, isDark, textMuted])

  const heartStyle = useMemo(() => ({
    fill:      liked ? '#ef4444' : 'none',
    stroke:    liked ? '#ef4444' : 'currentColor',
    transform: liked ? 'scale(1.2)' : 'scale(1)',
    transition:'transform 0.2s ease',
  }), [liked])

  return (
    <motion.div
      onClick={handleClick}
      className="w-full rounded-2xl overflow-hidden cursor-pointer group"
      style={{ background: themeColors.bg, border: `1px solid ${themeColors.border}` }}
      whileHover={isDark ? CARD_HOVER_DARK : CARD_HOVER_LIGHT}
      transition={CARD_TRANSITION}
    >
      {post.image && (
        <div style={{ height: '150px', overflow: 'hidden' }}>
          <img
            src={post.image} alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={imageStyle}
          />
        </div>
      )}

      <div className="p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Badge + time */}
        <div className="flex items-center justify-between mb-3" style={{ flexDirection: 'row' }}>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"
            style={badgeStyle}
          >
            <Icon className="w-3 h-3" />
            {lang === 'ar' ? meta.ar : meta.en}
          </div>
          <div className="flex items-center gap-1 text-[9px] font-semibold" style={{ color: textMuted }}>
            {post.isUpcoming && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md me-1"
                style={{ background: 'rgba(69,132,130,0.14)', color: '#458482' }}
              >
                <CalendarClock className="w-2.5 h-2.5" />
                {lang === 'ar' ? 'قادم' : 'Upcoming'}
              </span>
            )}
            <Clock className="w-3 h-3" />
            {post.timestamp}
          </div>
        </div>

        {/* Title */}
        <h3
          className="text-sm font-bold mb-2 leading-snug"
          style={{
            color: 'var(--foreground)',
            fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
          }}
        >
          {title}
        </h3>

        {/* Body preview */}
        <div className="mb-3">
          <p
            className="text-[11px] leading-relaxed"
            style={{
              color: textMuted,
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}
          >
            {preview}
          </p>
          {hasMore && (
            <p className="text-[10px] font-bold mt-1.5" style={{ color: '#458482' }}>
              {lang === 'ar' ? '← اضغط لقراءة المزيد' : 'Click to read more →'}
            </p>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: themeColors.divider, marginBottom: '12px' }} />

        {/* Footer */}
        <div className="flex items-center justify-between" style={{ flexDirection: 'row' }}>
          <div className="flex items-center gap-2" style={{ flexDirection: 'row' }}>
            <Avatar
              avatarUrl={post.avatarUrl}
              initials={post.avatar}
              name={author}
              size={24}
              color={post.avatarColor}
              className="text-white font-black"
            />
            <span
              className="text-[10px] font-semibold"
              style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {author}
            </span>
          </div>

          {/* Delete (Chief/Developer/news.publish admins only) + Like */}
          <div className="flex items-center gap-1.5" style={{ flexDirection: 'row' }}>
            {isAdmin && (
              confirmingDelete ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={handleConfirmDelete}
                    title={lang === 'ar' ? 'تأكيد الحذف' : 'Confirm delete'}
                    className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    title={lang === 'ar' ? 'إلغاء' : 'Cancel'}
                    className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: textMuted }}
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartDelete}
                  title={lang === 'ar' ? 'حذف الخبر' : 'Delete post'}
                  className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer transition-colors"
                  style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', color: textMuted }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'; e.currentTarget.style.color = textMuted }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )
            )}

            {/* Like */}
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all"
              style={likeBtnStyle}
            >
              <Heart
                className="w-3.5 h-3.5 transition-transform"
                style={heartStyle}
              />
              <span>{likes}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default memo(NewsCard)