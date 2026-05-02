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

  const searchPlaceholder = lang === 'ar' ? 'بحث في المهام والمشاريع...' : 'SEARCH TASKS OR PROJECTS...';
  const welcomeText       = lang === 'ar' ? 'مرحباً،' : 'Welcome back,';

  const textMain  = 'var(--foreground)';
  const textMuted = 'var(--foreground-muted)';

  return (
    <header
      className="h-16 sm:h-20 sticky top-0 z-40 flex items-center px-4 sm:px-6 lg:px-10"
      style={{
        /* In RTL: search on left, greeting on right — achieved by reversing the row */
        flexDirection:        isRTL ? 'row-reverse' : 'row',
        justifyContent:       'space-between',
        background:           isDark ? 'rgba(13,17,23,0.85)' : 'rgba(249,249,243,0.85)',
        borderBottom:         `1px solid var(--divider)`,
        backdropFilter:       'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        gap:                  '1rem',
      }}
    >

      {/* ── Side A: hamburger + greeting
            LTR → left side   (flex-start)
            RTL → right side  (visually, because row is reversed) ── */}
      <div
        className="flex items-center gap-3 min-w-0"
        style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
      >
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer"
          style={{ color: textMuted, background: 'var(--hover-bg)' }}
          onMouseEnter={e => e.currentTarget.style.color = textMain}
          onMouseLeave={e => e.currentTarget.style.color = textMuted}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Greeting block */}
        <div
          className="flex flex-col gap-0.5 min-w-0"
          style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}
        >
          {/* Welcome + name row */}
          <div
            className="flex items-center gap-1.5"
            style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
          >
            <span
              className="text-sm font-medium whitespace-nowrap"
              style={{
                color:      textMuted,
                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              }}
            >
              {welcomeText}
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

          {/* Date row */}
          <div
            className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest"
            style={{
              color:         textMuted,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              textTransform: lang === 'ar' ? 'none' : 'uppercase',
            }}
          >
            <CalendarIcon size={11} className="text-[#458482]/70 shrink-0" />
            <span className="truncate">{today}</span>
          </div>
        </div>
      </div>

      {/* ── Side B: search + bell
            LTR → right side
            RTL → left side  (visually, because row is reversed) ── */}
      <div
        className="flex items-center gap-3 sm:gap-4 shrink-0"
        style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
      >
        {/* Search — hidden on small screens */}
        <div className="relative hidden md:block">
          {/* Icon position flips with RTL */}
          <Search
            className="absolute top-1/2 -translate-y-1/2 transition-colors pointer-events-none"
            style={{
              [isRTL ? 'right' : 'left']: '14px',
              color: textMuted,
            }}
            size={13}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            dir={isRTL ? 'rtl' : 'ltr'}
            className="rounded-full py-2.5 text-[10px] font-bold tracking-widest outline-none transition-all w-52 lg:w-64"
            style={{
              background:   isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
              border:       `1px solid var(--input-border)`,
              color:        textMain,
              paddingLeft:  isRTL ? '14px'   : '36px',
              paddingRight: isRTL ? '36px'   : '14px',
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
          className="relative p-2.5 rounded-xl transition-all cursor-pointer shrink-0"
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