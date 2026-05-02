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

  const t = {
    welcome: lang === 'ar' ? 'مرحباً،' : 'Welcome back,',
    search:  lang === 'ar' ? 'بحث في المهام والمشاريع...' : 'SEARCH TASKS OR PROJECTS...',
  };

  const textMain  = 'var(--foreground)';
  const textMuted = 'var(--foreground-muted)';
  const inputBorder = 'var(--input-border)';

  return (
    <header
      className="h-16 sm:h-20 sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 lg:px-10"
      style={{
        background:           isDark ? 'rgba(13,17,23,0.85)' : 'rgba(249,249,243,0.85)',
        borderBottom:         `1px solid var(--divider)`,
        backdropFilter:       'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        flexDirection:        isRTL ? 'row-reverse' : 'row',
      }}
    >
      {/* ─── Greeting side ─── */}
      <div className="flex items-center gap-3 sm:gap-4"
        style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>

        {/* Mobile hamburger */}
        <button onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer"
          style={{ color: textMuted, background: 'var(--hover-bg)' }}>
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-0.5"
          style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>

          <div className="flex items-center gap-2"
            style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <span className="text-sm font-medium" style={{ color: textMuted }}>
              {t.welcome}
            </span>
            {/* الاسم يبقى إنجليزي دايماً */}
            <span className="font-bold text-sm tracking-wide uppercase flex items-center gap-1"
              style={{ color: textMain, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              Alwaqee
              <Sparkles size={13} className="text-[#458482]" />
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: textMuted, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <CalendarIcon size={11} className="text-[#458482]/70 shrink-0" />
            <span>{today}</span>
          </div>
        </div>
      </div>

      {/* ─── Search + Bell side ─── */}
      <div className="flex items-center gap-3 sm:gap-5"
        style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>

        {/* Search */}
        <div className="relative group hidden md:block">
          <Search
            className="absolute top-1/2 -translate-y-1/2 transition-colors"
            style={{
              color: textMuted,
              [isRTL ? 'right' : 'left']: '1rem',
            }}
            size={13}
          />
          <input
            type="text"
            placeholder={t.search}
            className="rounded-full py-2.5 text-[10px] font-bold tracking-widest outline-none transition-all w-56 lg:w-72"
            style={{
              background:   isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
              border:       `1px solid ${inputBorder}`,
              color:        textMain,
              paddingLeft:  isRTL ? '1rem'    : '2.75rem',
              paddingRight: isRTL ? '2.75rem' : '1rem',
              direction:    isRTL ? 'rtl' : 'ltr',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(69,132,130,0.5)'}
            onBlur={e  => e.currentTarget.style.borderColor = inputBorder}
          />
        </div>

        {/* Bell */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2.5 rounded-xl transition-all cursor-pointer"
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