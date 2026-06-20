"use client"

import { memo, useMemo } from "react"
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { Archive, Layers } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'

// ─── Module-level constants (zero per-render allocation) ───────────────────────
const TEXT_MAIN  = "var(--foreground)";
const TEXT_MUTED = "var(--foreground-muted)";
const BRAND_TEAL = "#458482";

const BRAND_TEAL_TEXT_STYLE: React.CSSProperties = { color: BRAND_TEAL };
const STAT_COUNT_STYLE: React.CSSProperties = { color: TEXT_MAIN, lineHeight: 1 };

const AMBIENT_GLOW_STYLE: React.CSSProperties = {
  background: 'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(69,132,130,0.12), transparent)',
};

const GRID_PATTERN_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px),
                    linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
  backgroundSize: '40px 40px',
};

const ICON_WRAPPER_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg, #458482, #5ea8a4)',
  boxShadow:  '0 8px 32px rgba(69,132,130,0.35)',
};

function ArchiveHero({ platformCount = 9 }: { platformCount?: number }) {
  const { theme } = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  const tx = useMemo(() => ({
    label:     lang === 'ar' ? 'المستودع'      : 'Archive',
    title:     lang === 'ar' ? 'أرشيف المنصات' : 'Platform Archive',
    subtitle:  lang === 'ar'
      ? 'كل مواردك في مكان واحد — اختر منصة للوصول إلى ملفاتها'
      : 'All your resources in one place — select a platform to access its files',
    platforms: lang === 'ar' ? 'منصة' : 'Platforms',
  }), [lang]);

  const wrapperStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark
      ? 'linear-gradient(135deg, #161b22 0%, #1a2332 50%, #161b22 100%)'
      : 'linear-gradient(135deg, #f0f0e8 0%, #e8ede8 50%, #f0f0e8 100%)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
  }), [isDark]);

  const labelStyle = useMemo<React.CSSProperties>(() => ({
    color: BRAND_TEAL,
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [lang]);

  const titleStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MAIN,
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
    letterSpacing: lang === 'ar' ? 0 : '-0.02em',
  }), [lang]);

  // Shared by both the subtitle AND the "Platforms" label — identical expression in both spots
  const mutedTextStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MUTED,
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [lang]);

  const statBadgeStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
  }), [isDark]);

  return (
    <LazyMotion features={domAnimation}>
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="relative overflow-hidden rounded-2xl p-8"
        style={wrapperStyle}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none" style={AMBIENT_GLOW_STYLE} />

        {/* Subtle grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={GRID_PATTERN_STYLE} />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">

          {/* Icon */}
          <m.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
            style={ICON_WRAPPER_STYLE}
          >
            <Archive className="w-8 h-8 text-white" />
          </m.div>

          {/* Text */}
          <div className="flex-1">
            <m.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-[10px] font-black uppercase tracking-[0.2em] mb-1"
              style={labelStyle}
            >
              {tx.label}
            </m.p>

            <m.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-3xl font-black mb-2"
              style={titleStyle}
            >
              {tx.title}
            </m.h1>

            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm"
              style={mutedTextStyle}
            >
              {tx.subtitle}
            </m.p>
          </div>

          {/* Stat badge */}
          <m.div
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="shrink-0 text-center px-6 py-4 rounded-xl"
            style={statBadgeStyle}
          >
            <Layers className="w-4 h-4 mx-auto mb-1" style={BRAND_TEAL_TEXT_STYLE} />
            <div className="text-2xl font-black" style={STAT_COUNT_STYLE}>
              {platformCount}
            </div>
            <div
              className="text-[9px] font-bold uppercase tracking-widest mt-1"
              style={mutedTextStyle}
            >
              {tx.platforms}
            </div>
          </m.div>

        </div>
      </div>
    </LazyMotion>
  )
}

export default memo(ArchiveHero)