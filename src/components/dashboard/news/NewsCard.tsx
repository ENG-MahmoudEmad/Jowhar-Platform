"use client"

import React, { useMemo, useCallback, memo } from 'react'
import { Heart, Clock, Megaphone, RefreshCw, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
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
  onLike:  () => void
  onClick: (post: NewsPost) => void
}

function NewsCard({ post, liked, likes, onLike, onClick }: NewsCardProps) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

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
    const over = post.body.length > PREVIEW_CHARS
    return {
      preview: over ? post.body.slice(0, PREVIEW_CHARS) + '…' : post.body,
      hasMore: over,
    }
  }, [post.body])

  const handleClick = useCallback(() => onClick(post), [onClick, post])

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onLike()
  }, [onLike])

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

  const avatarStyle = useMemo(() => ({
    background: post.avatarColor,
    boxShadow: `0 2px 8px ${post.avatarColor}40`,
  }), [post.avatarColor])

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
            <Clock className="w-3 h-3" />
            {post.timestamp}
          </div>
        </div>

        {/* Title */}
        <h3
          className="text-sm font-bold mb-2 leading-snug"
          style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}
        >
          {title}
        </h3>

        {/* Body preview */}
        <div className="mb-3">
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
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
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-black shrink-0"
              style={avatarStyle}
            >
              {post.avatar}
            </div>
            <span
              className="text-[10px] font-semibold"
              style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {author}
            </span>
          </div>

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
    </motion.div>
  )
}

export default memo(NewsCard)