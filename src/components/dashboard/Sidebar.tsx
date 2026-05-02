"use client"

import React, { useState } from 'react';
import {
  LayoutDashboard, CheckSquare, Archive,
  Newspaper, LogOut, Settings, ChevronRight,
  PanelLeftClose, PanelLeftOpen, Sun, Moon, Languages,
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

const menuItems = [
  { nameEn: 'Tracker Tasks', nameAr: 'متابعة المهام', icon: LayoutDashboard, path: '/dashboard' },
  { nameEn: 'My Tasks',      nameAr: 'مهامي',          icon: CheckSquare,     path: '/dashboard/my-tasks' },
  { nameEn: 'Archive',       nameAr: 'الأرشيف',        icon: Archive,         path: '/dashboard/archive' },
  { nameEn: 'News Feed',     nameAr: 'الأخبار',        icon: Newspaper,       path: '/dashboard/news' },
  { nameEn: 'Settings',      nameAr: 'الإعدادات',      icon: Settings,        path: '/dashboard/settings' },
];

const navContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const navItemVariant: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};


export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, isRTL } = useLang();

  const isDark = theme === 'dark';

  const bg          = 'var(--sidebar-bg)';
  const borderColor = 'var(--sidebar-border)';
  const cardBg      = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)';
  const cardBorder  = 'var(--card-border)';
  const divider     = 'var(--divider)';
  const textIdle    = 'var(--foreground-muted)';
  const textMain    = 'var(--foreground)';
  const hoverBg     = 'var(--hover-bg)';

  const activeBorderSide = isRTL ? 'borderRight' : 'borderLeft';

  const CollapseIcon = isRTL
    ? (isOpen ? PanelLeftOpen  : PanelLeftClose)
    : (isOpen ? PanelLeftClose : PanelLeftOpen);

  return (
    <motion.aside
      animate={{ width: isOpen ? 288 : 72 }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      className="h-screen flex flex-col relative overflow-hidden select-none shrink-0"
      style={{
        background:  bg,
        borderRight: isRTL ? 'none'                     : `1px solid ${borderColor}`,
        borderLeft:  isRTL ? `1px solid ${borderColor}` : 'none',
      }}
    >
      {/* ─── Glows ─── */}
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(69,132,130,0.1) 0%,transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute -bottom-24 -right-12 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(69,132,130,0.06) 0%,transparent 70%)', filter: 'blur(50px)' }} />

      {/* ─── Header ─── */}
      <div className="h-16 sm:h-20 flex items-center px-3 shrink-0 gap-2"
        style={{ borderBottom: `1px solid ${divider}` }}>

        <div className={`flex-1 min-w-0 overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="full"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}>
                <Link href="/dashboard" className="block group/logo px-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.45em] mb-0.5"
                    style={{ color: 'rgba(69,132,130,0.6)' }}>Studio</p>
                  <h2 className="text-xl font-black uppercase leading-none whitespace-nowrap
                      group-hover/logo:text-[#5ea8a4] transition-colors duration-200"
                    style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.2em', color: textMain }}>
                    JOWHAR
                  </h2>
                  <div className="h-[1.5px] mt-1.5 w-8 rounded-full"
                    style={{ background: isRTL
                      ? 'linear-gradient(to left,#458482,transparent)'
                      : 'linear-gradient(to right,#458482,transparent)' }} />
                </Link>
              </motion.div>
            ) : (
              <motion.div key="mark"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex justify-center">
                <Link href="/dashboard">
                  <span className="text-base font-black uppercase text-[#5ea8a4]"
                    style={{ fontFamily: "'Georgia', serif" }}>J</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={() => setIsOpen(o => !o)}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer"
          style={{ color: textIdle }}
          onMouseEnter={e => { e.currentTarget.style.color = '#5ea8a4'; e.currentTarget.style.background = hoverBg; }}
          onMouseLeave={e => { e.currentTarget.style.color = textIdle;  e.currentTarget.style.background = 'transparent'; }}
        >
          <CollapseIcon className="w-4 h-4" />
        </button>
      </div>

      {/* ─── Nav ─── */}
      <motion.nav variants={navContainer} initial="hidden" animate="show"
        className="flex-1 py-3 px-2 space-y-0.5 overflow-hidden">
        {menuItems.map((it) => {
          const isActive = pathname === it.path;
          const label    = lang === 'ar' ? it.nameAr : it.nameEn;
          return (
            <motion.div key={it.path} variants={navItemVariant}>
              <Link href={it.path} className="block group/item relative">
                <div
                  className={`relative h-11 flex items-center rounded-xl overflow-hidden
                    ${isOpen ? (isRTL ? 'flex-row-reverse' : '') : 'justify-center'}`}
                  style={{ color: isActive ? textMain : textIdle }}
                >
                  {isActive && (
                    <motion.div layoutId="activeNav"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: isOpen
                          ? isRTL
                            ? 'linear-gradient(270deg,rgba(69,132,130,0.18) 0%,rgba(69,132,130,0.04) 100%)'
                            : 'linear-gradient(90deg,rgba(69,132,130,0.18) 0%,rgba(69,132,130,0.04) 100%)'
                          : 'rgba(69,132,130,0.14)',
                        [activeBorderSide]: isOpen ? '2px solid #458482' : 'none',
                        outline: !isOpen ? '1px solid rgba(69,132,130,0.3)' : 'none',
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                    />
                  )}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-150"
                      style={{ background: hoverBg }} />
                  )}

                  {/* Icon */}
                  <div className="relative z-10 w-11 h-11 flex items-center justify-center shrink-0">
                    <it.icon className="w-[18px] h-[18px] transition-transform duration-150 group-hover/item:scale-110"
                      style={{
                        color:  isActive ? '#5ea8a4' : 'currentColor',
                        filter: isActive ? 'drop-shadow(0 0 5px rgba(94,168,164,0.4))' : 'none',
                      }} />
                  </div>

                  {/* Label */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: isRTL ? 6 : -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: isRTL ? 6 : -6 }}
                        transition={{ duration: 0.12 }}
                        className="flex-1 text-[11px] font-bold uppercase tracking-[0.12em] whitespace-nowrap overflow-hidden z-10"
                        style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Chevron */}
                  {isOpen && (
                    <div className="relative z-10 w-8 flex justify-center shrink-0">
                      <ChevronRight className={`w-3.5 h-3.5 transition-all duration-150
                        ${isRTL ? 'rotate-180' : ''}
                        ${isActive
                          ? 'opacity-100 text-[#458482]'
                          : `opacity-0 group-hover/item:opacity-40
                             ${isRTL ? 'translate-x-1 group-hover/item:translate-x-0' : '-translate-x-1 group-hover/item:translate-x-0'}`
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Tooltip */}
                {!isOpen && (
                  <div className={`absolute top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg
                    text-[10px] font-bold uppercase tracking-widest whitespace-nowrap
                    opacity-0 group-hover/item:opacity-100 pointer-events-none
                    transition-opacity duration-100 z-50
                    ${isRTL ? 'right-full mr-3' : 'left-full ml-3'}`}
                    style={{
                      background: isDark ? '#161b22' : '#fff',
                      color: textMain,
                      border: `1px solid ${borderColor}`,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    }}>
                    {label}
                    <div className={`absolute top-1/2 -translate-y-1/2 border-4 border-transparent
                      ${isRTL ? 'left-full' : 'right-full'}`}
                      style={{ borderColor: isRTL
                        ? `transparent transparent transparent ${isDark ? '#161b22' : '#fff'}`
                        : `transparent ${isDark ? '#161b22' : '#fff'} transparent transparent`
                      }} />
                  </div>
                )}
              </Link>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* ─── Theme + Language ─── */}
      <div className="px-2 py-1 shrink-0" style={{ borderTop: `1px solid ${divider}` }}>
        {[
          {
            Icon:    isDark ? Sun : Moon,
            label:   isDark
              ? (lang === 'ar' ? 'الوضع الفاتح' : 'Light Mode')
              : (lang === 'ar' ? 'الوضع الداكن' : 'Dark Mode'),
            onClick: toggleTheme,
          },
          {
            Icon:    Languages,
            label:   lang === 'en' ? 'العربية' : 'English',
            onClick: toggleLang,
          },
        ].map((btn, i) => (
          <button key={i} onClick={btn.onClick}
            className={`w-full h-10 flex items-center rounded-xl transition-colors duration-150 cursor-pointer
              ${isRTL ? 'flex-row-reverse' : ''}
              ${!isOpen ? 'justify-center' : ''}`}
            style={{ color: textIdle }}
            onMouseEnter={e => { e.currentTarget.style.color = textMain; e.currentTarget.style.background = hoverBg; }}
            onMouseLeave={e => { e.currentTarget.style.color = textIdle; e.currentTarget.style.background = 'transparent'; }}
          >
            <div className="w-11 h-10 flex items-center justify-center shrink-0">
              <btn.Icon className="w-[17px] h-[17px]" />
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="text-[11px] font-bold uppercase tracking-[0.12em] whitespace-nowrap"
                  style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                >
                  {btn.label}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>

      {/* ─── User card ─── */}
      <div className="p-2 pb-3 shrink-0">
        <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>

          {/* ── Avatar row ──
              الـ avatar والـ text في نفس الـ flex container
              لكن الـ avatar مش مغلف بأي animation —
              فقط النص اللي بجانبه يظهر ويختفي بـ opacity بس ─── */}
          <div
            className="flex items-center mb-2.5"
            style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: isOpen ? '0.75rem' : '0', justifyContent: isOpen ? 'flex-start' : 'center' }}
          >
            {/* Avatar — ثابت تماماً، لا animation، لا تحرك */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg,#4e9996 0%,#2d5c5a 100%)', boxShadow: '0 4px 12px rgba(69,132,130,0.3)' }}>
                A
              </div>
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border-2 rounded-full"
                style={{ borderColor: 'var(--sidebar-bg)', boxShadow: '0 0 5px rgba(52,211,153,0.5)' }} />
            </div>

            {/* النص — opacity فقط، بدون x أو y أو width */}
            <div
              className="flex flex-col min-w-0 overflow-hidden"
              style={{
                opacity:    isOpen ? 1 : 0,
                maxWidth:   isOpen ? '200px' : '0px',
                transition: 'opacity 0.15s ease, max-width 0.15s ease',
                alignItems: isRTL ? 'flex-end' : 'flex-start',
              }}
            >
              {/* الاسم يبقى إنجليزي دايماً */}
              <span className="text-[11px] font-bold uppercase tracking-wider truncate whitespace-nowrap"
                style={{ color: textMain }}>
                Alwaqee
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.12em] whitespace-nowrap"
                style={{ color: '#5ea8a4' }}>
                {lang === 'ar' ? 'محترف' : 'Animator PRO'}
              </span>
            </div>
          </div>

          <div className="h-px mx-1 mb-2 rounded-full" style={{ background: divider }} />

          {/* Sign out */}
          <button
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl
              transition-all duration-150 cursor-pointer border border-transparent
              ${isRTL ? 'flex-row-reverse' : ''}`}
            style={{ color: textIdle }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#f87171';
              e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = textIdle;
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <div
              style={{
                opacity:    isOpen ? 1 : 0,
                maxWidth:   isOpen ? '200px' : '0px',
                overflow:   'hidden',
                transition: 'opacity 0.15s ease, max-width 0.15s ease',
              }}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] whitespace-nowrap"
                style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ─── Grain ─── */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <filter id="sg">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#sg)"/>
        </svg>
      </div>
    </motion.aside>
  );
}