"use client"

import React, { useEffect, useMemo, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, Heart } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import type { NewsPost } from './NewsFeed'

const TYPE_META = {
  announcement: { color: '#3b82f6', en: 'Announcement', ar: 'إعلان'  },
  update:       { color: '#a855f7', en: 'Update',       ar: 'تحديث' },
  alert:        { color: '#ef4444', en: 'Alert',        ar: 'تنبيه' },
}

const BACKDROP_STYLE: React.CSSProperties = { background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }
const BACKDROP_TRANSITION = { duration: 0.2 }
const MODAL_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const }
const DIVIDER_STYLE: React.CSSProperties = { height: '1px', background: 'var(--divider)', margin: '20px 0' }

const stopPropagation = (e: React.MouseEvent) => e.stopPropagation()

interface NewsModalProps {
  post:    NewsPost | null
  liked:   boolean
  likes:   number
  onClose: () => void
  onLike:  () => void
}

function NewsModal({ post, liked, likes, onClose, onLike }: NewsModalProps) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    if (post) document.body.style.overflow = 'hidden'
    else      document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [post])

  const meta   = post ? TYPE_META[post.type] : null
  const title  = post ? (lang === 'ar' ? post.titleAr : post.title) : ''
  const author = post ? (lang === 'ar' ? post.authorAr : post.author) : ''

  const modalStyle = useMemo(() => ({
    background: isDark ? 'var(--card)' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  }), [isDark])

  const imageStyle = useMemo(() => ({ filter: isDark ? 'brightness(0.8)' : 'none' }), [isDark])

  const closeBtnStyle = useMemo(() => ({
    [isRTL ? 'left' : 'right']: '12px',
    width: '32px', height: '32px',
    background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    color: 'var(--foreground)',
  }), [isRTL, isDark])

  const badgeStyle = useMemo(() => meta ? { background: `${meta.color}18`, color: meta.color } : undefined, [meta])

  const avatarStyle = useMemo(() => post ? {
    background: post.avatarColor, boxShadow: `0 2px 8px ${post.avatarColor}40`,
  } : undefined, [post])

  const likeBtnStyle = useMemo(() => ({
    background: liked ? 'rgba(239,68,68,0.12)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
    color:      liked ? '#ef4444' : 'var(--foreground-muted)',
    border:     liked ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
    transition: 'all 0.2s ease',
  }), [liked, isDark])

  const heartStyle = useMemo(() => ({
    fill:      liked ? '#ef4444' : 'none',
    stroke:    liked ? '#ef4444' : 'currentColor',
    transform: liked ? 'scale(1.2)' : 'scale(1)',
    transition:'transform 0.2s ease',
  }), [liked])

  return (
    <AnimatePresence>
      {post && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={BACKDROP_TRANSITION}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={BACKDROP_STYLE}
          onClick={onClose}
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={MODAL_TRANSITION}
            onClick={stopPropagation}
            dir={isRTL ? 'rtl' : 'ltr'}
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl"
            style={modalStyle}
          >
            {post.image && (
              <div style={{ height: '200px', overflow: 'hidden' }}>
                <img
                  src={post.image} alt={title}
                  className="w-full h-full object-cover"
                  style={imageStyle}
                />
              </div>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-3 rounded-xl flex items-center justify-center cursor-pointer"
              style={closeBtnStyle}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6">
              {/* Badge + time */}
              <div className="flex items-center justify-between mb-4" style={{ flexDirection: 'row' }}>
                {meta && (
                  <div
                    className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"
                    style={badgeStyle}
                  >
                    {lang === 'ar' ? meta.ar : meta.en}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: 'var(--foreground-muted)' }}>
                  <Clock className="w-3 h-3" />
                  {post.timestamp}
                </div>
              </div>

              {/* Title */}
              <h2
                className="text-xl font-black mb-4 leading-snug"
                style={{
                  color: 'var(--foreground)',
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
                  letterSpacing: lang === 'ar' ? 0 : '-0.01em',
                }}
              >
                {title}
              </h2>

              {/* Full body */}
              <p
                className="text-[13px] leading-relaxed"
                style={{
                  color: 'var(--foreground-muted)',
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                }}
              >
                {post.body}
              </p>

              <div style={DIVIDER_STYLE} />

              {/* Footer */}
              <div className="flex items-center justify-between" style={{ flexDirection: 'row' }}>
                <div className="flex items-center gap-2" style={{ flexDirection: 'row' }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0"
                    style={avatarStyle}
                  >
                    {post.avatar}
                  </div>
                  <span className="text-[11px] font-semibold" style={{
                    color: 'var(--foreground)',
                    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                  }}>
                    {author}
                  </span>
                </div>

                <button
                  onClick={onLike}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold cursor-pointer"
                  style={likeBtnStyle}
                >
                  <Heart
                    className="w-4 h-4"
                    style={heartStyle}
                  />
                  <span>{likes}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default memo(NewsModal)