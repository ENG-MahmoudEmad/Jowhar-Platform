"use client"

import React from 'react';
import { Bell, Search, Calendar as CalendarIcon, Sparkles, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { lang, isRTL } = useLang();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const today = new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const textMain  = 'var(--foreground)';
  const textMuted = 'var(--foreground-muted)';

  return (
    <header
      dir={isRTL ? 'rtl' : 'ltr'}
      className="h-16 sm:h-20 sticky top-0 z-40"
      style={{
        background:           isDark ? 'rgba(13,17,23,0.85)' : 'rgba(249,249,243,0.85)',
        borderBottom:         `1px solid var(--divider)`,
        backdropFilter:       'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        /* 
          Use a simple flex row always.
          In RTL: greeting on RIGHT, search+bell on LEFT.
          We achieve this by reversing the row direction.
        */
        display:        'flex',
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 1rem',
        gap:            '0.75rem',
      }}
    >

      {/* ── Greeting block (LEFT in LTR, RIGHT in RTL) ── */}
      <div
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           '0.75rem',
          flexDirection: 'row',
          minWidth:      0,
        }}
      >
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="xl:hidden w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          style={{ color: textMuted, background: 'var(--hover-bg)', order: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = textMain}
          onMouseLeave={e => e.currentTarget.style.color = textMuted}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start', minWidth: 0, order: 1 }}>

          {/* مرحباً / Welcome back + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexDirection: 'row' }}>
            <span
              className="text-sm font-medium whitespace-nowrap"
              style={{
                color:      textMuted,
                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              }}
            >
              {lang === 'ar' ? 'مرحباً،' : 'Welcome back,'}
            </span>
            {/* Name always English */}
            <span
              className="font-bold text-sm tracking-wide uppercase flex items-center gap-1 whitespace-nowrap"
              style={{ color: textMain }}
            >
              Alwaqee
              <Sparkles size={13} className="text-[#458482] shrink-0" />
            </span>
          </div>

          {/* Date */}
          <div
            style={{
              display:       'flex',
              alignItems:    'center',
              gap:           '5px',
              flexDirection: 'row',
              color:         textMuted,
              fontSize:      '10px',
              fontWeight:    700,
              letterSpacing: '0.08em',
            }}
          >
            <CalendarIcon size={11} className="text-[#458482]/70 shrink-0" />
            <span className="truncate">{today}</span>
          </div>
        </div>
      </div>

      {/* ── Search + Bell (RIGHT in LTR, LEFT in RTL) ── */}
      <div
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           '0.75rem',
          flexDirection: 'row',
          flexShrink:    0,
        }}
      >
        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              [isRTL ? 'right' : 'left']: '14px',
              color: textMuted,
              width: 13, height: 13,
            }}
          />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث في المهام والمشاريع...' : 'SEARCH TASKS OR PROJECTS...'}
            dir={isRTL ? 'rtl' : 'ltr'}
            className="rounded-full py-2.5 outline-none transition-all w-52 lg:w-64"
            style={{
              background:   isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
              border:       `1px solid var(--input-border)`,
              color:        textMain,
              fontSize:     '10px',
              fontWeight:   700,
              letterSpacing:'0.08em',
              paddingLeft:  isRTL ? '14px' : '36px',
              paddingRight: isRTL ? '36px' : '14px',
              fontFamily:   lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            }}
            onFocus={e  => e.currentTarget.style.borderColor = 'rgba(69,132,130,0.5)'}
            onBlur={e   => e.currentTarget.style.borderColor = 'var(--input-border)'}
          />
        </div>

        {/* Bell */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2.5 rounded-xl cursor-pointer shrink-0"
          style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
            border:     `1px solid var(--card-border)`,
            color:      textMuted,
          }}
        >
          <Bell size={17} />
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full border-2"
            style={{
              background:  '#458482',
              borderColor: isDark ? '#0d1117' : '#F9F9F3',
              boxShadow:   '0 0 6px rgba(69,132,130,0.7)',
            }}
          />
        </motion.button>
      </div>
    </header>
  );
}
