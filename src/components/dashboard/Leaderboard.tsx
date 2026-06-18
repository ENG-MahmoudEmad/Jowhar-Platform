"use client"

import React, { memo, useCallback, useMemo, useRef } from 'react'
import { LazyMotion, domAnimation, m, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
  import type { MotionStyle } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderEntry {
  rank: 1 | 2 | 3
  name: string
  initials: string
  memberColor: string
  score: number
  tasksCompleted: number
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const LEADERS: LeaderEntry[] = [
  { rank: 1, name: 'KB',     initials: 'KB', memberColor: '#f59e0b', score: 98,  tasksCompleted: 24 },
  { rank: 2, name: 'MODYER', initials: 'MO', memberColor: '#94a3b8', score: 87,  tasksCompleted: 19 },
  { rank: 3, name: 'Medoma', initials: 'MD', memberColor: '#cd7f32', score: 76,  tasksCompleted: 15 },
]

// Pre-indexed lookup — avoids a linear .find() scan on every render
const LEADERS_BY_RANK: Record<1 | 2 | 3, LeaderEntry> = {
  1: LEADERS[0],
  2: LEADERS[1],
  3: LEADERS[2],
}

// Podium render order — hoisted so the array isn't recreated every render
const PODIUM_ORDER: (1 | 2 | 3)[] = [2, 1, 3]

// ─── Theme primitives that never actually change at runtime ────────────────────

const TEXT_MAIN = 'var(--foreground)'
const TEXT_MUTED = 'var(--foreground-muted)'

// ─── Medal configs ─────────────────────────────────────────────────────────────

const MEDAL = {
  1: {
    gradientId: 'gold-grad',
    stops: [
      { offset: '0%',   color: '#ffe566' },
      { offset: '35%',  color: '#f6a800' },
      { offset: '65%',  color: '#e07b00' },
      { offset: '100%', color: '#ffd700' },
    ],
    glowColor: 'rgba(246,168,0,0.6)',
    rimColor:  '#ffe566',
    label: { en: '1st Place', ar: 'المركز الأول' },
    trophySize: 100,
  },
  2: {
    gradientId: 'silver-grad',
    stops: [
      { offset: '0%',   color: '#f0f4f8' },
      { offset: '35%',  color: '#b0bec5' },
      { offset: '65%',  color: '#78909c' },
      { offset: '100%', color: '#cfd8dc' },
    ],
    glowColor: 'rgba(148,163,184,0.38)',
    rimColor:  '#e2e8f0',
    label: { en: '2nd Place', ar: 'المركز الثاني' },
    trophySize: 64,
  },
  3: {
    gradientId: 'bronze-grad',
    stops: [
      { offset: '0%',   color: '#f4a460' },
      { offset: '35%',  color: '#cd7f32' },
      { offset: '65%',  color: '#a0522d' },
      { offset: '100%', color: '#daa520' },
    ],
    glowColor: 'rgba(205,127,50,0.38)',
    rimColor:  '#f4a460',
    label: { en: '3rd Place', ar: 'المركز الثالث' },
    trophySize: 64,
  },
}

// ─── Module-level static style objects (zero dependency on props/state) ────────

const NOISE_SVG_WRAP_STYLE: React.CSSProperties = { position: 'absolute', overflow: 'hidden' }
const HERO_SHIMMER_STYLE: React.CSSProperties = {
  width: '80%', height: '1px',
  background: 'linear-gradient(90deg, transparent, rgba(246,168,0,0.6), transparent)',
}
const HEADER_ICON_WRAP_STYLE: React.CSSProperties = { background: 'rgba(69,132,130,0.1)' }
const TITLE_WRAP_STYLE: React.CSSProperties = { textAlign: 'start' }
const SUBTITLE_STYLE: React.CSSProperties = { color: TEXT_MUTED }

// Shared by both stat labels in both Hero/Side cards — identical in all 4 spots
const STAT_LABEL_STYLE: React.CSSProperties = { fontSize: 9, color: TEXT_MUTED }

// Hero's medal config is always MEDAL[1], so these never vary
const HERO_SCORE_VALUE_STYLE: React.CSSProperties = {
  fontSize: 26,
  background: `linear-gradient(135deg, ${MEDAL[1].stops[0].color}, ${MEDAL[1].stops[2].color})`,
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
}
const HERO_TASKS_VALUE_STYLE: React.CSSProperties = { fontSize: 26, color: TEXT_MAIN }
const SIDE_TASKS_VALUE_STYLE: React.CSSProperties = { fontSize: 20, color: TEXT_MAIN }

// ─── Shared SVG defs ──────────────────────────────────────────────────────────

const NoiseDefs = memo(function NoiseDefs() {
  return (
    <svg width="0" height="0" style={NOISE_SVG_WRAP_STYLE}>
      <defs>
        <filter id="lb-noise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" result="noiseOut" />
          <feColorMatrix type="saturate" values="0" in="noiseOut" result="grayNoise" />
          <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blended" />
          <feComposite in="blended" in2="SourceGraphic" operator="in" />
        </filter>
        {([1, 2, 3] as const).map(rank => {
          const cfg = MEDAL[rank]
          return (
            <linearGradient key={rank} id={cfg.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              {cfg.stops.map((s, i) => (
                <stop key={i} offset={s.offset} stopColor={s.color} />
              ))}
            </linearGradient>
          )
        })}
      </defs>
    </svg>
  )
})

// ─── Trophy SVG ───────────────────────────────────────────────────────────────
// viewBox "-8 -2 80 72" gives extra room on all sides so handles never clip
// The left handle reaches x=5, right handle x=59 — both safely inside -8 to 72

const TrophySVG = memo(function TrophySVG({ size }: { size: number }) {
  const cfg = MEDAL[1]
  return (
    <svg
      width={size}
      height={size}
      viewBox="-8 -2 80 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 10px 32px ${cfg.glowColor})`, overflow: 'visible' }}
    >
      <g filter="url(#lb-noise)">
        <path d="M16 6h32v24c0 12-10 19-16 19S16 42 16 30V6Z" fill={`url(#${cfg.gradientId})`} />
        <path d="M16 10C9 10 5 14 5 18c0 8 5 11 11 9.5" stroke={`url(#${cfg.gradientId})`} strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M48 10c7 0 11 4 11 8 0 8-5 11-11 9.5" stroke={`url(#${cfg.gradientId})`} strokeWidth="4" strokeLinecap="round" fill="none" />
        <rect x="29" y="49" width="6" height="8" rx="1.5" fill={`url(#${cfg.gradientId})`} />
        <rect x="21" y="57" width="22" height="5" rx="2.5" fill={`url(#${cfg.gradientId})`} />
        <ellipse cx="25" cy="18" rx="5" ry="7" fill="rgba(255,255,255,0.22)" />
      </g>
      <path d="M16 6h32" stroke={cfg.rimColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
    </svg>
  )
})

// ─── Medal SVG ────────────────────────────────────────────────────────────────

const MedalSVG = memo(function MedalSVG({ rank, size }: { rank: 2 | 3; size: number }) {
  const cfg = MEDAL[rank]
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 4px 14px ${cfg.glowColor})` }}
    >
      <g filter="url(#lb-noise)">
        <circle cx="32" cy="34" r="20" fill={`url(#${cfg.gradientId})`} />
        <circle cx="32" cy="34" r="14" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        <text x="32" y="40" textAnchor="middle" fontSize="17" fontWeight="900" fill="rgba(255,255,255,0.95)" fontFamily="system-ui">
          {rank}
        </text>
        <ellipse cx="25" cy="27" rx="4" ry="6" fill="rgba(255,255,255,0.2)" />
      </g>
      <circle cx="32" cy="34" r="20" stroke={cfg.rimColor} strokeWidth="1" opacity="0.5" fill="none" />
    </svg>
  )
})

// ─── Shared card props type ───────────────────────────────────────────────────

interface CardThemeProps {
  lang: string
  index: number
  isDark: boolean
  dividerColor: string
  avatarRing: string
}

// ─── Hero card (1st place) ────────────────────────────────────────────────────

const HeroCard = memo(function HeroCard({ entry, ...t }: { entry: LeaderEntry } & CardThemeProps) {
  const cfg = MEDAL[1]

  const cardStyle = useMemo<React.CSSProperties>(() => ({
    flex: '1.4',
    background: t.isDark ? 'rgba(246,168,0,0.04)' : 'rgba(246,168,0,0.06)',
    border: `1px solid ${t.isDark ? 'rgba(246,168,0,0.2)' : 'rgba(246,168,0,0.28)'}`,
    padding: '28px 20px 20px',
    boxShadow: t.isDark
      ? '0 0 60px rgba(246,168,0,0.1)'
      : '0 0 40px rgba(246,168,0,0.07), 0 4px 20px rgba(0,0,0,0.05)',
    overflow: 'visible',
  }), [t.isDark])

  // Contains a motion-only `x` transform key, so left untyped (matches m.div's MotionStyle)
  const innerGlowStyle = useMemo(() => ({
    top: -20, left: '50%', x: '-50%',
    width: 260, height: 160,
    background: `radial-gradient(ellipse 70% 55% at 50% 40%, ${t.isDark ? 'rgba(246,168,0,0.18)' : 'rgba(246,168,0,0.1)'} 0%, transparent 70%)`,
    filter: 'blur(20px)',
    zIndex: 0,
  }), [t.isDark])

  const avatarStyle = useMemo<React.CSSProperties>(() => ({
    width: 68, height: 68, fontSize: 20,
    background: entry.memberColor,
    border: `3px solid ${cfg.stops[1].color}`,
    boxShadow: `0 0 0 2px ${t.avatarRing}, 0 4px 24px ${cfg.glowColor}`,
  }), [entry.memberColor, t.avatarRing])

  const nameStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: 16, color: TEXT_MAIN, fontFamily: t.lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [t.lang])

  const rankLabelStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: 10, marginTop: 4,
    background: `linear-gradient(90deg, ${cfg.stops[0].color}, ${cfg.stops[2].color})`,
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
    textTransform: t.lang === 'ar' ? 'none' : 'uppercase',
    letterSpacing: '0.1em',
  }), [t.lang])

  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: t.index * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col items-center rounded-[20px]"
      style={cardStyle}
    >
      {/* Top shimmer line */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={HERO_SHIMMER_STYLE}
      />

      {/* Animated inner glow */}
      <m.div
        className="absolute pointer-events-none"
        style={innerGlowStyle}
        animate={{
          scaleX: [1, 1.25, 0.85, 1.15, 1],
          scaleY: [1, 0.8, 1.2, 0.9, 1],
          opacity: [0.7, 1, 0.5, 0.9, 0.7],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating trophy */}
      <m.div
        className="mb-3 relative z-10"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, y: [0, -6, 0] }}
        transition={{
          scale:   { delay: t.index * 0.12 + 0.2, duration: 0.55, ease: [0.34, 1.56, 0.64, 1] },
          opacity: { delay: t.index * 0.12 + 0.2, duration: 0.55 },
          y:       { delay: 0.8, duration: 3, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <TrophySVG size={cfg.trophySize} />
      </m.div>

      {/* Avatar */}
      <div
        className="rounded-full flex items-center justify-center font-extrabold text-white mb-2.5 relative z-10"
        style={avatarStyle}
      >
        {entry.initials}
      </div>

      {/* Name */}
      <p className="relative z-10 font-extrabold tracking-wide" style={nameStyle}>
        {entry.name}
      </p>

      {/* Rank label */}
      <p className="relative z-10 font-bold tracking-widest mb-3" style={rankLabelStyle}>
        {t.lang === 'ar' ? cfg.label.ar : cfg.label.en}
      </p>

      {/* Divider */}
      <div className="w-full h-px mb-3 relative z-10" style={{ background: t.dividerColor }} />

      {/* Stats */}
      <div className="flex w-full relative z-10">
        <div className="flex-1 text-center">
          <p className="font-black tabular-nums leading-none" style={HERO_SCORE_VALUE_STYLE}>
            {entry.score}
          </p>
          <p className="mt-1 font-semibold uppercase tracking-widest" style={STAT_LABEL_STYLE}>
            {t.lang === 'ar' ? 'النقاط' : 'Score'}
          </p>
        </div>
        <div className="w-px self-stretch" style={{ background: t.dividerColor }} />
        <div className="flex-1 text-center">
          <p className="font-black tabular-nums leading-none" style={HERO_TASKS_VALUE_STYLE}>
            {entry.tasksCompleted}
          </p>
          <p className="mt-1 font-semibold uppercase tracking-widest" style={STAT_LABEL_STYLE}>
            {t.lang === 'ar' ? 'مهام' : 'Tasks'}
          </p>
        </div>
      </div>
    </m.div>
  )
})

// ─── Side card (2nd & 3rd) ────────────────────────────────────────────────────

const SideCard = memo(function SideCard({ entry, ...t }: { entry: LeaderEntry } & CardThemeProps) {
  const cfg = MEDAL[entry.rank]

  const cardStyle = useMemo<React.CSSProperties>(() => ({
    flex: '1',
    background: t.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    border: `1px solid ${t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
    padding: '20px 16px',
  }), [t.isDark])

  const avatarStyle = useMemo<React.CSSProperties>(() => ({
    width: 56, height: 56, fontSize: 16,
    background: entry.memberColor,
    border: `3px solid ${cfg.stops[1].color}`,
    boxShadow: `0 0 0 2px ${t.avatarRing}`,
  }), [entry.memberColor, entry.rank, t.avatarRing])

  const nameStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: 14, color: TEXT_MAIN, fontFamily: t.lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [t.lang])

  const rankLabelStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: 10, marginTop: 4,
    background: `linear-gradient(90deg, ${cfg.stops[0].color}, ${cfg.stops[2].color})`,
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
    textTransform: t.lang === 'ar' ? 'none' : 'uppercase',
    letterSpacing: '0.1em',
  }), [entry.rank, t.lang])

  const scoreValueStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: 20,
    background: `linear-gradient(135deg, ${cfg.stops[0].color}, ${cfg.stops[2].color})`,
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  }), [entry.rank])

  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: t.index * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center rounded-2xl overflow-hidden"
      style={cardStyle}
    >
      {/* Medal */}
      <m.div className="mb-3"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: t.index * 0.12 + 0.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}>
        <MedalSVG rank={entry.rank as 2 | 3} size={cfg.trophySize} />
      </m.div>

      {/* Avatar */}
      <div
        className="rounded-full flex items-center justify-center font-extrabold text-white mb-2.5"
        style={avatarStyle}
      >
        {entry.initials}
      </div>

      {/* Name */}
      <p className="font-extrabold tracking-wide" style={nameStyle}>
        {entry.name}
      </p>

      {/* Rank label */}
      <p className="font-bold tracking-widest mb-3" style={rankLabelStyle}>
        {t.lang === 'ar' ? cfg.label.ar : cfg.label.en}
      </p>

      {/* Divider */}
      <div className="w-full h-px mb-3" style={{ background: t.dividerColor }} />

      {/* Stats */}
      <div className="flex w-full">
        <div className="flex-1 text-center">
          <p className="font-black tabular-nums leading-none" style={scoreValueStyle}>
            {entry.score}
          </p>
          <p className="mt-1 font-semibold uppercase tracking-widest" style={STAT_LABEL_STYLE}>
            {t.lang === 'ar' ? 'النقاط' : 'Score'}
          </p>
        </div>
        <div className="w-px self-stretch" style={{ background: t.dividerColor }} />
        <div className="flex-1 text-center">
          <p className="font-black tabular-nums leading-none" style={SIDE_TASKS_VALUE_STYLE}>
            {entry.tasksCompleted}
          </p>
          <p className="mt-1 font-semibold uppercase tracking-widest" style={STAT_LABEL_STYLE}>
            {t.lang === 'ar' ? 'مهام' : 'Tasks'}
          </p>
        </div>
      </div>
    </m.div>
  )
})

// ─── Main component ───────────────────────────────────────────────────────────

function Leaderboard() {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  // ── Theme tokens — same pattern as ProjectCalendar ──
  const bg         = isDark ? 'var(--card)'           : '#ffffff'
  const border     = isDark ? 'var(--card-border)'    : 'rgba(0,0,0,0.07)'
  const headerBg   = isDark ? 'var(--background-alt)' : '#f5f5ef'
  const divider    = isDark ? 'var(--divider)'        : 'rgba(0,0,0,0.06)'
  const avatarRing = isDark ? 'var(--card)'           : '#ffffff'
  // Spotlight intensity: prominent in dark, subtle in light
  const spotA      = isDark ? 0.22 : 0.09
  const spotB      = isDark ? 0.08 : 0.03

  // ── Mouse tracking ──
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX  = useMotionValue(0)
  const mouseY  = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 })
  const rotateX  = useTransform(springY, [-1, 1], [ 2, -2])
  const rotateY  = useTransform(springX, [-1, 1], [-3,  3])
  const glowLeft = useTransform(springX, [-1, 1], ['35%', '65%'])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set(((e.clientX - rect.left)  / rect.width)  * 2 - 1)
    mouseY.set(((e.clientY - rect.top)   / rect.height) * 2 - 1)
  }, [mouseX, mouseY])

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0)
    mouseY.set(0)
  }, [mouseX, mouseY])

  const cardTheme = useMemo<Omit<CardThemeProps, 'index'>>(() => ({
    lang, isDark, dividerColor: divider, avatarRing,
  }), [lang, isDark, divider, avatarRing])

  const containerStyle = useMemo<React.CSSProperties>(() => ({
    background: bg, border: `1px solid ${border}`,
  }), [bg, border])

  const headerStyle = useMemo<React.CSSProperties>(() => ({
    background: headerBg, borderBottom: `1px solid ${divider}`, zIndex: 1,
  }), [headerBg, divider])

  const titleStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MAIN,
    textTransform: lang === 'ar' ? 'none' : 'uppercase',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [lang])

  const monthBadgeStyle = useMemo<React.CSSProperties>(() => ({
    background: 'rgba(69,132,130,0.1)',
    color: '#458482',
    border: '1px solid rgba(69,132,130,0.2)',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [lang])

  // Contain motion-only `x` key — left untyped to match m.div's MotionStyle
  const spotlightTopStyle = useMemo(() => ({
    top: -80, left: glowLeft, x: '-50%',
    width: 600, height: 340,
    background: `radial-gradient(ellipse 60% 50% at 50% 30%, rgba(246,168,0,${spotA}) 0%, rgba(246,168,0,${spotB}) 40%, transparent 75%)`,
    zIndex: 0, borderRadius: '50%', filter: 'blur(18px)',
  }), [glowLeft, spotA, spotB])

  const spotlightBottomStyle = useMemo(() => ({
    top: 60, left: glowLeft, x: '-50%',
    width: 460, height: 180,
    background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(246,168,0,${spotB}) 0%, transparent 70%)`,
    zIndex: 0, filter: 'blur(30px)',
  }), [glowLeft, spotB])

  // Contains rotateX/rotateY/transformPerspective — motion-only, left untyped


const podiumTiltStyle = useMemo<MotionStyle>(
  () => ({
    zIndex: 1,
    rotateX,
    rotateY,
    transformPerspective: 1000,
    transformStyle: "preserve-3d",
  }),
  [rotateX, rotateY]
);

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.42, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        dir={isRTL ? 'rtl' : 'ltr'}
        className="w-full"
      >
        <NoiseDefs />

        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative w-full rounded-2xl overflow-hidden"
          style={containerStyle}
        >
          {/* Spotlight — animated + follows mouse */}
          <m.div
            className="absolute pointer-events-none"
            style={spotlightTopStyle}
            animate={{
              scaleX: [1, 1.18, 0.92, 1.12, 1],
              scaleY: [1, 0.88, 1.1, 0.95, 1],
              opacity: [0.8, 1, 0.65, 0.95, 0.8],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <m.div
            className="absolute pointer-events-none"
            style={spotlightBottomStyle}
            animate={{ opacity: [0.6, 1, 0.5, 0.9, 0.6] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Header */}
          <div
            className="relative flex items-center justify-between px-6 py-5"
            style={headerStyle}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg shrink-0" style={HEADER_ICON_WRAP_STYLE}>
                <svg width="18" height="18" viewBox="0 0 64 64" fill="none">
                  <path d="M20 8h24v20c0 10-8 16-12 16s-12-6-12-16V8Z" fill="#458482" opacity="0.9" />
                  <path d="M20 12C14 12 10 16 10 20c0 6 4 8 10 7" stroke="#458482" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  <path d="M44 12c6 0 10 4 10 8 0 6-4 8-10 7" stroke="#458482" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  <rect x="29" y="44" width="6" height="8" rx="1" fill="#458482" opacity="0.9" />
                  <rect x="22" y="52" width="20" height="5" rx="2.5" fill="#458482" opacity="0.9" />
                </svg>
              </div>
              <div style={TITLE_WRAP_STYLE}>
                <h2 className="text-sm font-bold tracking-widest" style={titleStyle}>
                  {lang === 'ar' ? 'لوحة المتصدرين' : 'Leaderboard'}
                </h2>
                <p className="text-[10px] font-medium mt-0.5" style={SUBTITLE_STYLE}>
                  {lang === 'ar' ? 'أفضل أداء هذا الشهر' : 'Top performers this month'}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={monthBadgeStyle}>
              {lang === 'ar' ? 'هذا الشهر' : 'This month'}
            </span>
          </div>

          {/* Podium — 3D tilt on mouse */}
          <m.div className="relative p-6" style={podiumTiltStyle}>
            <div className="flex items-end gap-5">
              {PODIUM_ORDER.map(rank => {
                const entry     = LEADERS_BY_RANK[rank]
                const animIndex = rank === 1 ? 0 : rank === 2 ? 1 : 2
                if (rank === 1) return <HeroCard key={rank} entry={entry} {...cardTheme} index={animIndex} />
                return <SideCard key={rank} entry={entry} {...cardTheme} index={animIndex} />
              })}
            </div>
          </m.div>
        </div>
      </m.div>
    </LazyMotion>
  )
}

export default memo(Leaderboard)