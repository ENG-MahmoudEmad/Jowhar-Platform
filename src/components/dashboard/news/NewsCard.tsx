"use client"

import React from 'react'
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

interface NewsCardProps {
  post:    NewsPost
  liked:   boolean
  likes:   number
  onLike:  () => void
  onClick: (post: NewsPost) => void
}

export default function NewsCard({ post, liked, likes, onLike, onClick }: NewsCardProps) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  const bg        = isDark ? 'var(--card)'        : '#ffffff'
  const border    = isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)'
  const divider   = isDark ? 'var(--divider)'     : 'rgba(0,0,0,0.06)'
  const textMuted = 'var(--foreground-muted)'

  const meta   = TYPE_META[post.type]
  const Icon   = meta.icon
  const title  = lang === 'ar' ? post.titleAr : post.title
  const author = lang === 'ar' ? post.authorAr : post.author

  const preview = post.body.length > PREVIEW_CHARS
    ? post.body.slice(0, PREVIEW_CHARS) + '…'
    : post.body
  const hasMore = post.body.length > PREVIEW_CHARS

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    onLike()
  }

  return (
    <motion.div
      onClick={() => onClick(post)}
      className="w-full rounded-2xl overflow-hidden cursor-pointer group"
      style={{ background: bg, border: `1px solid ${border}` }}
      whileHover={{ y: -2, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)' }}
      transition={{ duration: 0.2 }}
    >
      {post.image && (
        <div style={{ height: '150px', overflow: 'hidden' }}>
          <img
            src={post.image} alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ filter: isDark ? 'brightness(0.85)' : 'none' }}
          />
        </div>
      )}

      <div className="p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Badge + time */}
        <div className="flex items-center justify-between mb-3" style={{ flexDirection: 'row' }}>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"
            style={{ background: `${meta.color}18`, color: meta.color }}
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
        <div style={{ height: '1px', background: divider, marginBottom: '12px' }} />

        {/* Footer */}
        <div className="flex items-center justify-between" style={{ flexDirection: 'row' }}>
          <div className="flex items-center gap-2" style={{ flexDirection: 'row' }}>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-black shrink-0"
              style={{ background: post.avatarColor, boxShadow: `0 2px 8px ${post.avatarColor}40` }}
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
            style={{
              background: liked ? 'rgba(239,68,68,0.12)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
              color:      liked ? '#ef4444' : textMuted,
              border:     liked ? '1px solid rgba(239,68,68,0.25)' : '1px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            <Heart
              className="w-3.5 h-3.5 transition-transform"
              style={{
                fill:      liked ? '#ef4444' : 'none',
                stroke:    liked ? '#ef4444' : 'currentColor',
                transform: liked ? 'scale(1.2)' : 'scale(1)',
                transition:'transform 0.2s ease',
              }}
            />
            <span>{likes}</span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}