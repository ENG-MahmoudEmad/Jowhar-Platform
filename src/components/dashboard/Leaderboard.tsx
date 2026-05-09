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

// ─── Trophy SVG (1st place) ───────────────────────────────────────────────────

function TrophySVG({ size }: { size: number }) {
  const cfg = MEDAL[1]
  return (
    <svg
      width={size} height={size}
      viewBox="-4 0 72 68"
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

// ─── Medal SVG (2nd & 3rd) ────────────────────────────────────────────────────

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

// ─── Hero card (1st place) ────────────────────────────────────────────────────

function HeroCard({
  entry,
  lang,
  index,
}: {
  entry: LeaderEntry
  lang: string
  index: number
}) {
  const cfg = MEDAL[1]

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col items-center rounded-[20px]"
      style={{
        flex: '1.4',
        background: 'rgba(246,168,0,0.04)',
        border: '1px solid rgba(246,168,0,0.2)',
        padding: '28px 20px 20px',
        boxShadow: '0 0 60px rgba(246,168,0,0.1)',
        overflow: 'visible',
        clipPath: 'none',
      }}
    >
      {/* Top shimmer line */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: '80%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(246,168,0,0.6), transparent)',
        }}
      />

      {/* Animated inner glow blob */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: -20,
          left: '50%',
          x: '-50%',
          width: 260,
          height: 160,
          background: 'radial-gradient(ellipse 70% 55% at 50% 40%, rgba(246,168,0,0.18) 0%, transparent 70%)',
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

      {/* Trophy — floating */}
      <motion.div
        className="mb-3 relative z-10"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, y: [0, -6, 0] }}
        transition={{
          scale: { delay: index * 0.12 + 0.2, duration: 0.55, ease: [0.34, 1.56, 0.64, 1] },
          opacity: { delay: index * 0.12 + 0.2, duration: 0.55 },
          y: { delay: 0.8, duration: 3, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <TrophySVG size={cfg.trophySize} />
      </motion.div>

      {/* Avatar */}
      <div
        className="rounded-full flex items-center justify-center font-extrabold text-white mb-2.5"
        style={{
          width: 68, height: 68, fontSize: 20,
          background: entry.memberColor,
          border: `3px solid ${cfg.stops[1].color}`,
          boxShadow: `0 0 0 2px #0a0c10, 0 4px 24px ${cfg.glowColor}`,
        }}
      >
        {entry.initials}
      </div>

      {/* Name */}
      <p
        className="font-extrabold tracking-wide"
        style={{
          fontSize: 16,
          color: '#e6edf3',
          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
        }}
      >
        {entry.name}
      </p>

      {/* Label */}
      <p
        className="font-bold tracking-widest mb-3"
        style={{
          fontSize: 10,
          background: `linear-gradient(90deg, ${cfg.stops[0].color}, ${cfg.stops[2].color})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textTransform: lang === 'ar' ? 'none' : 'uppercase',
          letterSpacing: '0.1em',
          marginTop: 4,
        }}
      >
        {lang === 'ar' ? cfg.label.ar : cfg.label.en}
      </p>

      {/* Divider */}
      <div className="w-full h-px mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Stats */}
      <div className="flex w-full">
        <div className="flex-1 text-center">
          <p
            className="font-black tabular-nums leading-none"
            style={{
              fontSize: 26,
              background: `linear-gradient(135deg, ${cfg.stops[0].color}, ${cfg.stops[2].color})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {entry.score}
          </p>
          <p className="mt-1 font-semibold uppercase tracking-widest" style={{ fontSize: 9, color: '#64748b' }}>
            {lang === 'ar' ? 'النقاط' : 'Score'}
          </p>
        </div>
        <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex-1 text-center">
          <p className="font-black tabular-nums leading-none" style={{ fontSize: 26, color: '#e6edf3' }}>
            {entry.tasksCompleted}
          </p>
          <p className="mt-1 font-semibold uppercase tracking-widest" style={{ fontSize: 9, color: '#64748b' }}>
            {lang === 'ar' ? 'مهام' : 'Tasks'}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Side card (2nd & 3rd) ────────────────────────────────────────────────────

function SideCard({
  entry,
  lang,
  index,
}: {
  entry: LeaderEntry
  lang: string
  index: number
}) {
  const cfg = MEDAL[entry.rank]

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center rounded-2xl overflow-hidden"
      style={{
        flex: '1',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '20px 16px',
      }}
    >
      {/* Medal */}
      <motion.div
        className="mb-3"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.12 + 0.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <MedalSVG rank={entry.rank as 2 | 3} size={cfg.trophySize} />
      </motion.div>

      {/* Avatar */}
      <div
        className="rounded-full flex items-center justify-center font-extrabold text-white mb-2.5"
        style={{
          width: 56, height: 56, fontSize: 16,
          background: entry.memberColor,
          border: `3px solid ${cfg.stops[1].color}`,
          boxShadow: `0 0 0 2px #0a0c10`,
        }}
      >
        {entry.initials}
      </div>

      {/* Name */}
      <p
        className="font-extrabold tracking-wide"
        style={{
          fontSize: 14,
          color: '#e6edf3',
          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
        }}
      >
        {entry.name}
      </p>

      {/* Label */}
      <p
        className="font-bold tracking-widest mb-3"
        style={{
          fontSize: 10,
          background: `linear-gradient(90deg, ${cfg.stops[0].color}, ${cfg.stops[2].color})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textTransform: lang === 'ar' ? 'none' : 'uppercase',
          letterSpacing: '0.1em',
          marginTop: 4,
        }}
      >
        {lang === 'ar' ? cfg.label.ar : cfg.label.en}
      </p>

      {/* Divider */}
      <div className="w-full h-px mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Stats */}
      <div className="flex w-full">
        <div className="flex-1 text-center">
          <p
            className="font-black tabular-nums leading-none"
            style={{
              fontSize: 20,
              background: `linear-gradient(135deg, ${cfg.stops[0].color}, ${cfg.stops[2].color})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {entry.score}
          </p>
          <p className="mt-1 font-semibold uppercase tracking-widest" style={{ fontSize: 9, color: '#64748b' }}>
            {lang === 'ar' ? 'النقاط' : 'Score'}
          </p>
        </div>
        <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex-1 text-center">
          <p className="font-black tabular-nums leading-none" style={{ fontSize: 20, color: '#e6edf3' }}>
            {entry.tasksCompleted}
          </p>
          <p className="mt-1 font-semibold uppercase tracking-widest" style={{ fontSize: 9, color: '#64748b' }}>
            {lang === 'ar' ? 'مهام' : 'Tasks'}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Leaderboard() {
  const { lang, isRTL } = useLang()
  const containerRef = useRef<HTMLDivElement>(null)

  // Mouse tracking — raw values
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Smooth springs
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 })

  // Subtle tilt on the whole podium
  const rotateX = useTransform(springY, [-1, 1], [2, -2])
  const rotateY = useTransform(springX, [-1, 1], [-3, 3])

  // Glow follows mouse
  const glowLeft = useTransform(springX, [-1, 1], ['35%', '65%'])

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1   // -1 to 1
    const y = ((e.clientY - rect.top)  / rect.height) * 2 - 1  // -1 to 1
    mouseX.set(x)
    mouseY.set(y)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  // podium order: 2nd — 1st — 3rd
  const podiumOrder: (1 | 2 | 3)[] = [2, 1, 3]

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="w-full">
      {/* Shared SVG defs */}
      <NoiseDefs />

      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full rounded-[20px] overflow-hidden"
        style={{
          background: '#0a0c10',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Spotlight beam — follows mouse + breathes */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            top: -80,
            left: glowLeft,
            x: '-50%',
            width: 600,
            height: 340,
            background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(246,168,0,0.22) 0%, rgba(246,168,0,0.08) 40%, transparent 75%)',
            zIndex: 0,
            borderRadius: '50%',
            filter: 'blur(18px)',
          }}
          animate={{
            scaleX: [1, 1.18, 0.92, 1.12, 1],
            scaleY: [1, 0.88, 1.1, 0.95, 1],
            opacity: [0.8, 1, 0.65, 0.95, 0.8],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Secondary drifting glow */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            top: 60,
            left: glowLeft,
            x: '-50%',
            width: 460,
            height: 180,
            background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(246,168,0,0.1) 0%, transparent 70%)',
            zIndex: 0,
            filter: 'blur(30px)',
          }}
          animate={{
            opacity: [0.6, 1, 0.5, 0.9, 0.6],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Header */}
        <div
          className="relative flex items-center justify-between px-6 py-5 rounded-t-[20px] overflow-hidden"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            zIndex: 1,
          }}
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
                  color: '#e6edf3',
                  textTransform: lang === 'ar' ? 'none' : 'uppercase',
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                }}
              >
                {lang === 'ar' ? 'لوحة المتصدرين' : 'Leaderboard'}
              </h2>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: '#64748b' }}>
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

        {/* Podium */}
        <motion.div
          className="relative p-6"
          style={{
            zIndex: 1,
            rotateX,
            rotateY,
            transformPerspective: 1000,
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="flex items-end gap-5">
            {podiumOrder.map((rank, i) => {
              const entry = LEADERS.find(l => l.rank === rank)!
              const animIndex = rank === 1 ? 0 : rank === 2 ? 1 : 2
              if (rank === 1) {
                return (
                  <HeroCard key={rank} entry={entry} lang={lang} index={animIndex} />
                )
              }
              return (
                <SideCard key={rank} entry={entry} lang={lang} index={animIndex} />
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}