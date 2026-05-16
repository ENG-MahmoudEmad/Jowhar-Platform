"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'

export default function Footer() {
  const { lang, isRTL } = useLang()
  const { theme }       = useTheme()
  const isDark = theme === 'dark'

  const textMain  = 'var(--foreground)'
  const textMuted = 'var(--foreground-muted)'
  const year      = new Date().getFullYear()

  return (
    <footer
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        background:   isDark ? 'rgba(13,17,23,0.85)' : 'rgba(249,249,243,0.85)',
        borderTop:    '1px solid var(--divider)',
        backdropFilter:       'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 1.5rem',
        height:         '52px',
        gap:            '0.75rem',
        flexShrink:     0,
      }}
    >
      {/* Left — studio name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Tiny animated dot */}
        <motion.span
          style={{
            display:      'inline-block',
            width:        6, height: 6,
            borderRadius: '50%',
            background:   '#458482',
            boxShadow:    '0 0 6px rgba(69,132,130,0.7)',
            flexShrink:   0,
          }}
          animate={{ opacity: [1, 0.3, 1], scale: [1, 0.6, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span
          style={{
            color:         textMain,
            fontSize:      '10px',
            fontWeight:    700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
          }}
        >
          {lang === 'ar' ? 'استوديو جوهر' : 'Studio Jowhar'}
        </span>
      </div>

      {/* Center — copyright */}
      <span
        style={{
          color:      textMuted,
          fontSize:   '10px',
          fontWeight: 600,
          opacity:    0.6,
          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
          textAlign:  'center',
        }}
      >
        {lang === 'ar'
          ? `© ${year} جميع الحقوق محفوظة لاستوديو جوهر`
          : `© ${year} All credits reserved for Jowhar Studio`}
      </span>

      {/* Right — version/status badge */}
      <span
        style={{
          background:    'rgba(69,132,130,0.1)',
          color:         '#458482',
          border:        '1px solid rgba(69,132,130,0.2)',
          fontSize:      '9px',
          fontWeight:    700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding:       '3px 10px',
          borderRadius:  '999px',
          fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
          whiteSpace:    'nowrap',
        }}
      >
        {lang === 'ar' ? 'الإصدار 1.0' : 'v1.0'}
      </span>
    </footer>
  )
}