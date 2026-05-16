"use client"

import React, { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'

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

// ─── Shared SVG defs ──────────────────────────────────────────────────────────

function NoiseDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
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
}

// ─── Trophy SVG ───────────────────────────────────────────────────────────────
// viewBox "-8 -2 80 72" gives extra room on all sides so handles never clip
// The left handle reaches x=5, right handle x=59 — both safely inside -8 to 72

function TrophySVG({ size }: { size: number }) {
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
}

// ─── Medal SVG ────────────────────────────────────────────────────────────────

function MedalSVG({ rank, size }: { rank: 2 | 3; size: number }) {
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
}

// ─── Shared card props type ───────────────────────────────────────────────────

interface CardThemeProps {
  lang: string
  index: number
  isDark: boolean
  textMain: string
  textMuted: string
  dividerColor: string
  avatarRing: string
}

// ─── Hero card (1st place) ────────────────────────────────────────────────────

function HeroCard({ entry, ...t }: { entry: LeaderEntry } & CardThemeProps) {
  const cfg = MEDAL[1]

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: t.index * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col items-center rounded-[20px]"
      style={{
        flex: '1.4',
        background: t.isDark ? 'rgba(246,168,0,0.04)' : 'rgba(246,168,0,0.06)',
        border: `1px solid ${t.isDark ? 'rgba(246,168,0,0.2)' : 'rgba(246,168,0,0.28)'}`,
        padding: '28px 20px 20px',
        boxShadow: t.isDark
          ? '0 0 60px rgba(246,168,0,0.1)'
          : '0 0 40px rgba(246,168,0,0.07), 0 4px 20px rgba(0,0,0,0.05)',
        overflow: 'visible',
      }}
    >
      {/* Top shimmer line */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: '80%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(246,168,0,0.6), transparent)',
        }}
      />

      {/* Animated inner glow */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: -20, left: '50%', x: '-50%',
          width: 260, height: 160,
          background: `radial-gradient(ellipse 70% 55% at 50% 40%, ${t.isDark ? 'rgba(246,168,0,0.18)' : 'rgba(246,168,0,0.1)'} 0%, transparent 70%)`,
          filter: 'blur(20px)',
          zIndex: 0,
        }}
        animate={{
          scaleX: [1, 1.25, 0.85, 1.15, 1],
          scaleY: [1, 0.8, 1.2, 0.9, 1],
          opacity: [0.7, 1, 0.5, 0.9, 0.7],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating trophy */}
      <motion.div
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
      </motion.div>

      {/* Avatar */}
      <div
        className="rounded-full flex items-center justify-center font-extrabold text-white mb-2.5 relative z-10"
        style={{
          width: 68, height: 68, fontSize: 20,
          background: entry.memberColor,
          border: `3px solid ${cfg.stops[1].color}`,
          boxShadow: `0 0 0 2px ${t.avatarRing}, 0 4px 24px ${cfg.glowColor}`,
        }}
      >
        {entry.initials}
      </div>

      {/* Name */}
      <p className="relative z-10 font-extrabold tracking-wide"
        style={{ fontSize: 16, color: t.textMain, fontFamily: t.lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
        {entry.name}
      </p>

      {/* Rank label */}
      <p className="relative z-10 font-bold tracking-widest mb-3"
        style={{
          fontSize: 10, marginTop: 4,
          background: `linear-gradient(90deg, ${cfg.stops[0].color}, ${cfg.stops[2].color})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          textTransform: t.lang === 'ar' ? 'none' : 'uppercase',
          letterSpacing: '0.1em',
        }}>
        {t.lang === 'ar' ? cfg.label.ar : cfg.label.en}
      </p>

      {/* Divider */}
      <div className="w-full h-px mb-3 relative z-10" style={{ background: t.dividerColor }} />

      {/* Stats */}
      <div className="flex w-full relative z-10">
        <div className="flex-1 text-center">
          <p className="font-black tabular-nums leading-none"
            style={{
              fontSize: 26,
              background: `linear-gradient(135deg, ${cfg.stops[0].color}, ${cfg.stops[2].color})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
            {entry.score}
          </p>
          <p className="mt-1 font-semibold uppercase tracking-widest" style={{ fontSize: 9, color: t.textMuted }}>
            {t.lang === 'ar' ? 'النقاط' : 'Score'}
          </p>
        </div>
        <div className="w-px self-stretch" style={{ background: t.dividerColor }} />
        <div className="flex-1 text-center">
          <p className="font-black tabular-nums leading-none" style={{ fontSize: 26, color: t.textMain }}>
            {entry.tasksCompleted}
          </p>
          <p className="mt-1 font-semibold uppercase tracking-widest" style={{ fontSize: 9, color: t.textMuted }}>
            {t.lang === 'ar' ? 'مهام' : 'Tasks'}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Side card (2nd & 3rd) ────────────────────────────────────────────────────

function SideCard({ entry, ...t }: { entry: LeaderEntry } & CardThemeProps) {
  const cfg = MEDAL[entry.rank]

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: t.index * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center rounded-2xl overflow-hidden"
      style={{
        flex: '1',
        background: t.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        padding: '20px 16px',
      }}
    >
      {/* Medal */}
      <motion.div className="mb-3"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: t.index * 0.12 + 0.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}>
        <MedalSVG rank={entry.rank as 2 | 3} size={cfg.trophySize} />
      </motion.div>

      {/* Avatar */}
      <div
        className="rounded-full flex items-center justify-center font-extrabold text-white mb-2.5"
        style={{
          width: 56, height: 56, fontSize: 16,
          background: entry.memberColor,
          border: `3px solid ${cfg.stops[1].color}`,
          boxShadow: `0 0 0 2px ${t.avatarRing}`,
        }}
      >
        {entry.initials}
      </div>

      {/* Name */}
      <p className="font-extrabold tracking-wide"
        style={{ fontSize: 14, color: t.textMain, fontFamily: t.lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
        {entry.name}
      </p>

      {/* Rank label */}
      <p className="font-bold tracking-widest mb-3"
        style={{
          fontSize: 10, marginTop: 4,
          background: `linear-gradient(90deg, ${cfg.stops[0].color}, ${cfg.stops[2].color})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          textTransform: t.lang === 'ar' ? 'none' : 'uppercase',
          letterSpacing: '0.1em',
        }}>
        {t.lang === 'ar' ? cfg.label.ar : cfg.label.en}
      </p>

      {/* Divider */}
      <div className="w-full h-px mb-3" style={{ background: t.dividerColor }} />

      {/* Stats */}
      <div className="flex w-full">
        <div className="flex-1 text-center">
          <p className="font-black tabular-nums leading-none"
            style={{
              fontSize: 20,
              background: `linear-gradient(135deg, ${cfg.stops[0].color}, ${cfg.stops[2].color})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
            {entry.score}
          </p>
          <p className="mt-1 font-semibold uppercase tracking-widest" style={{ fontSize: 9, color: t.textMuted }}>
            {t.lang === 'ar' ? 'النقاط' : 'Score'}
          </p>
        </div>
        <div className="w-px self-stretch" style={{ background: t.dividerColor }} />
        <div className="flex-1 text-center">
          <p className="font-black tabular-nums leading-none" style={{ fontSize: 20, color: t.textMain }}>
            {entry.tasksCompleted}
          </p>
          <p className="mt-1 font-semibold uppercase tracking-widest" style={{ fontSize: 9, color: t.textMuted }}>
            {t.lang === 'ar' ? 'مهام' : 'Tasks'}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Leaderboard() {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  // ── Theme tokens — same pattern as ProjectCalendar ──
  const bg         = isDark ? 'var(--card)'           : '#ffffff'
  const border     = isDark ? 'var(--card-border)'    : 'rgba(0,0,0,0.07)'
  const headerBg   = isDark ? 'var(--background-alt)' : '#f5f5ef'
  const divider    = isDark ? 'var(--divider)'        : 'rgba(0,0,0,0.06)'
  const textMain   = 'var(--foreground)'
  const textMuted  = 'var(--foreground-muted)'
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

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set(((e.clientX - rect.left)  / rect.width)  * 2 - 1)
    mouseY.set(((e.clientY - rect.top)   / rect.height) * 2 - 1)
  }
  function handleMouseLeave() { mouseX.set(0); mouseY.set(0) }

  const podiumOrder: (1 | 2 | 3)[] = [2, 1, 3]
  const cardTheme: Omit<CardThemeProps, 'index'> = {
    lang, isDark, textMain, textMuted, dividerColor: divider, avatarRing,
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="w-full">
      <NoiseDefs />

      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        {/* Spotlight — animated + follows mouse */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            top: -80, left: glowLeft, x: '-50%',
            width: 600, height: 340,
            background: `radial-gradient(ellipse 60% 50% at 50% 30%, rgba(246,168,0,${spotA}) 0%, rgba(246,168,0,${spotB}) 40%, transparent 75%)`,
            zIndex: 0, borderRadius: '50%', filter: 'blur(18px)',
          }}
          animate={{
            scaleX: [1, 1.18, 0.92, 1.12, 1],
            scaleY: [1, 0.88, 1.1, 0.95, 1],
            opacity: [0.8, 1, 0.65, 0.95, 0.8],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute pointer-events-none"
          style={{
            top: 60, left: glowLeft, x: '-50%',
            width: 460, height: 180,
            background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(246,168,0,${spotB}) 0%, transparent 70%)`,
            zIndex: 0, filter: 'blur(30px)',
          }}
          animate={{ opacity: [0.6, 1, 0.5, 0.9, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Header */}
        <div
          className="relative flex items-center justify-between px-6 py-5"
          style={{ background: headerBg, borderBottom: `1px solid ${divider}`, zIndex: 1 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(69,132,130,0.1)' }}>
              <svg width="18" height="18" viewBox="0 0 64 64" fill="none">
                <path d="M20 8h24v20c0 10-8 16-12 16s-12-6-12-16V8Z" fill="#458482" opacity="0.9" />
                <path d="M20 12C14 12 10 16 10 20c0 6 4 8 10 7" stroke="#458482" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M44 12c6 0 10 4 10 8 0 6-4 8-10 7" stroke="#458482" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <rect x="29" y="44" width="6" height="8" rx="1" fill="#458482" opacity="0.9" />
                <rect x="22" y="52" width="20" height="5" rx="2.5" fill="#458482" opacity="0.9" />
              </svg>
            </div>
            <div style={{ textAlign: 'start' }}>
              <h2
                className="text-sm font-bold tracking-widest"
                style={{
                  color: textMain,
                  textTransform: lang === 'ar' ? 'none' : 'uppercase',
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                }}
              >
                {lang === 'ar' ? 'لوحة المتصدرين' : 'Leaderboard'}
              </h2>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: textMuted }}>
                {lang === 'ar' ? 'أفضل أداء هذا الشهر' : 'Top performers this month'}
              </p>
            </div>
          </div>

          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(69,132,130,0.1)',
              color: '#458482',
              border: '1px solid rgba(69,132,130,0.2)',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            }}
          >
            {lang === 'ar' ? 'هذا الشهر' : 'This month'}
          </span>
        </div>

        {/* Podium — 3D tilt on mouse */}
        <motion.div
          className="relative p-6"
          style={{ zIndex: 1, rotateX, rotateY, transformPerspective: 1000, transformStyle: 'preserve-3d' }}
        >
          <div className="flex items-end gap-5">
            {podiumOrder.map(rank => {
              const entry     = LEADERS.find(l => l.rank === rank)!
              const animIndex = rank === 1 ? 0 : rank === 2 ? 1 : 2
              if (rank === 1) return <HeroCard key={rank} entry={entry} {...cardTheme} index={animIndex} />
              return <SideCard key={rank} entry={entry} {...cardTheme} index={animIndex} />
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}