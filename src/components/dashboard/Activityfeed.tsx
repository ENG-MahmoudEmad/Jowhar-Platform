"use client"

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCheck, MessageSquare, Paperclip, UserPlus, AlertCircle, Activity } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'

type EventType = 'completed' | 'comment' | 'file' | 'joined' | 'overdue'

interface FeedEvent {
  id: number
  type: EventType
  member: string
  memberColor: string
  memberInitials: string
  taskEn: string
  taskAr: string
  timeEn: string
  timeAr: string
}

const EVENTS: FeedEvent[] = [
  { id:  1, type: 'completed', member: 'Tweeflue', memberColor: '#a855f7', memberInitials: 'TW', taskEn: 'Landing page redesign',    taskAr: 'إعادة تصميم الصفحة الرئيسية', timeEn: '2m ago',    timeAr: 'منذ 2 د'   },
  { id:  2, type: 'comment',   member: 'Omar',     memberColor: '#ef4444', memberInitials: 'OM', taskEn: 'API integration review',   taskAr: 'مراجعة تكامل الـ API',          timeEn: '8m ago',    timeAr: 'منذ 8 د'   },
  { id:  3, type: 'file',      member: 'Medoma',   memberColor: '#3b82f6', memberInitials: 'MD', taskEn: 'Brand assets v3',          taskAr: 'أصول العلامة v3',               timeEn: '15m ago',   timeAr: 'منذ 15 د'  },
  { id:  4, type: 'completed', member: 'Yahya',    memberColor: '#10b981', memberInitials: 'YH', taskEn: 'CI/CD pipeline setup',    taskAr: 'إعداد خط CI/CD',                timeEn: '32m ago',   timeAr: 'منذ 32 د'  },
  { id:  5, type: 'overdue',   member: 'Yehia',    memberColor: '#f97316', memberInitials: 'YE', taskEn: 'Push notification module', taskAr: 'وحدة الإشعارات الفورية',       timeEn: '1h ago',    timeAr: 'منذ 1 س'   },
  { id:  6, type: 'joined',    member: 'Sara',     memberColor: '#ec4899', memberInitials: 'SR', taskEn: 'QA Sprint 4',             taskAr: 'سبرينت QA 4',                   timeEn: '1h ago',    timeAr: 'منذ 1 س'   },
  { id:  7, type: 'comment',   member: 'Ahmed',    memberColor: '#2563eb', memberInitials: 'AH', taskEn: 'Dashboard analytics',     taskAr: 'تحليلات لوحة التحكم',           timeEn: '2h ago',    timeAr: 'منذ 2 س'   },
  { id:  8, type: 'completed', member: 'Lina',     memberColor: '#7c3aed', memberInitials: 'LN', taskEn: 'Content calendar Q3',    taskAr: 'تقويم المحتوى Q3',              timeEn: '3h ago',    timeAr: 'منذ 3 س'   },
  { id:  9, type: 'file',      member: 'KB',       memberColor: '#f59e0b', memberInitials: 'KB', taskEn: 'Architecture diagrams',   taskAr: 'مخططات المعمارية',              timeEn: '4h ago',    timeAr: 'منذ 4 س'   },
  { id: 10, type: 'overdue',   member: 'Tarek',    memberColor: '#c2410c', memberInitials: 'TK', taskEn: 'Cloud migration phase 2', taskAr: 'مرحلة 2 من الهجرة السحابية',   timeEn: '5h ago',    timeAr: 'منذ 5 س'   },
]

const EVENT_META: Record<EventType, {
  icon: React.ElementType
  color: string
  bgLight: string
  bgDark: string
  labelEn: string
  labelAr: string
  sentenceEn: (m: string, t: string) => string
  sentenceAr: (m: string, t: string) => string
}> = {
  completed: {
    icon: CheckCheck, color: '#10b981',
    bgLight: 'rgba(16,185,129,0.1)', bgDark: 'rgba(16,185,129,0.12)',
    labelEn: 'Completed', labelAr: 'مكتملة',
    sentenceEn: (m, t) => `completed "${t}"`,
    sentenceAr: (m, t) => `أكمل "${t}"`,
  },
  comment: {
    icon: MessageSquare, color: '#3b82f6',
    bgLight: 'rgba(59,130,246,0.1)', bgDark: 'rgba(59,130,246,0.12)',
    labelEn: 'Comments', labelAr: 'تعليقات',
    sentenceEn: (m, t) => `commented on "${t}"`,
    sentenceAr: (m, t) => `علّق على "${t}"`,
  },
  file: {
    icon: Paperclip, color: '#f59e0b',
    bgLight: 'rgba(245,158,11,0.1)', bgDark: 'rgba(245,158,11,0.12)',
    labelEn: 'Files', labelAr: 'ملفات',
    sentenceEn: (m, t) => `uploaded a file to "${t}"`,
    sentenceAr: (m, t) => `رفع ملفاً في "${t}"`,
  },
  joined: {
    icon: UserPlus, color: '#458482',
    bgLight: 'rgba(69,132,130,0.1)', bgDark: 'rgba(69,132,130,0.12)',
    labelEn: 'Joined', labelAr: 'انضمام',
    sentenceEn: (m, t) => `joined "${t}"`,
    sentenceAr: (m, t) => `انضم إلى "${t}"`,
  },
  overdue: {
    icon: AlertCircle, color: '#ef4444',
    bgLight: 'rgba(239,68,68,0.1)', bgDark: 'rgba(239,68,68,0.12)',
    labelEn: 'Overdue', labelAr: 'متأخرة',
    sentenceEn: (m, t) => `task "${t}" is overdue`,
    sentenceAr: (m, t) => `مهمة "${t}" متأخرة`,
  },
}

const ALL_TYPES: EventType[] = ['completed', 'comment', 'file', 'joined', 'overdue']

export default function ActivityFeed() {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  const bg        = isDark ? 'var(--card)'           : '#ffffff'
  const border    = isDark ? 'var(--card-border)'    : 'rgba(0,0,0,0.07)'
  const headerBg  = isDark ? 'var(--background-alt)' : '#f5f5ef'
  const divider   = isDark ? 'var(--divider)'        : 'rgba(0,0,0,0.06)'
  const textMain  = 'var(--foreground)'
  const textMuted = 'var(--foreground-muted)'
  const footerBg  = isDark ? 'rgba(13,17,23,0.5)'   : 'rgba(249,249,243,0.8)'
  const chipBg    = isDark ? 'rgba(255,255,255,0.05)': 'rgba(0,0,0,0.04)'
  const rowHover  = isDark ? 'rgba(255,255,255,0.03)': 'rgba(0,0,0,0.025)'

  const [activeFilter, setActiveFilter] = useState<EventType | 'all'>('all')
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  const filtered = useMemo(() =>
    activeFilter === 'all' ? EVENTS : EVENTS.filter(e => e.type === activeFilter),
    [activeFilter]
  )

  return (
    // ─── h-full + flex flex-col → يأخذ كامل ارتفاع الـ cell تبعه في الـ grid ───
    // الـ page.tsx لازم يكون: <div className="lg:col-span-2 flex flex-col h-full">
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full rounded-2xl overflow-hidden flex flex-col shadow-sm"
      style={{ background: bg, border: `1px solid ${border}`, height: '372px' }}
    >
      {/* ── Header ── */}
      <div
        className="p-5 flex items-center justify-between shrink-0"
        style={{ background: headerBg, borderBottom: `1px solid ${divider}` }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(69,132,130,0.1)' }}>
            <Activity size={18} className="text-[#458482]" />
          </div>
          <div className="text-start">
            <h2
              className="text-sm font-bold tracking-widest uppercase"
              style={{ color: textMain, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {lang === 'ar' ? 'آخر الأحداث' : 'Activity Feed'}
            </h2>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: textMuted }}>
              {lang === 'ar' ? 'نشاط الفريق' : 'Team activity'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: '#10b981' }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#10b981' }} />
          </span>
          <span className="text-[10px] font-semibold" style={{ color: '#10b981' }}>
            {lang === 'ar' ? 'مباشر' : 'Live'}
          </span>
        </div>
      </div>

      {/* ── Filter chips ── */}
      <div
        className="flex items-center gap-2 px-4 py-3 overflow-x-auto shrink-0"
        style={{ borderBottom: `1px solid ${divider}` }}
      >
        <button
          onClick={() => setActiveFilter('all')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0 transition-all"
          style={{
            background: activeFilter === 'all' ? '#458482' : chipBg,
            color: activeFilter === 'all' ? '#fff' : textMuted,
            fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
          }}
        >
          {lang === 'ar' ? 'الكل' : 'All'}
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
            style={{
              background: activeFilter === 'all' ? 'rgba(255,255,255,0.25)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
              color: activeFilter === 'all' ? '#fff' : textMuted,
            }}
          >
            {EVENTS.length}
          </span>
        </button>

        {ALL_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setActiveFilter(type)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0 transition-all"
            style={{
              background: activeFilter === type ? EVENT_META[type].color : chipBg,
              color: activeFilter === type ? '#fff' : textMuted,
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            }}
          >
            {lang === 'ar' ? EVENT_META[type].labelAr : EVENT_META[type].labelEn}
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{
                background: activeFilter === type ? 'rgba(255,255,255,0.25)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                color: activeFilter === type ? '#fff' : textMuted,
              }}
            >
              {EVENTS.filter(e => e.type === type).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Feed list ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
          {filtered.length === 0 ? (
            <div
              className="flex h-full items-center justify-center py-12 text-[12px]"
              style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {lang === 'ar' ? 'لا توجد أحداث حالياً' : 'No events found'}
            </div>
          ) : (
            filtered.map((event) => {
              const meta = EVENT_META[event.type]
              const Icon = meta.icon
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 px-4 py-4"
                  style={{
                    borderBottom: `1px solid ${divider}`,
                    background: hoveredId === event.id ? rowHover : 'transparent',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={() => setHoveredId(event.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Avatar */}
                  <div
                    className="relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-[11px]"
                    style={{ background: event.memberColor, boxShadow: `0 4px 10px ${event.memberColor}33` }}
                  >
                    {event.memberInitials}
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2"
                      style={{ background: meta.color, borderColor: bg }}
                    >
                      <Icon size={8} color="#fff" />
                    </div>
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 pt-0.5 text-start">
                    <p
                      className="text-[12px] leading-snug"
                      style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                    >
                      <span className="font-semibold" style={{ color: textMain }}>{event.member}</span>{' '}
                      {lang === 'ar'
                        ? meta.sentenceAr(event.member, event.taskAr)
                        : meta.sentenceEn(event.member, event.taskEn)
                      }
                    </p>
                    <p className="text-[10px] mt-1 opacity-60 font-medium" style={{ color: textMuted }}>
                      {lang === 'ar' ? event.timeAr : event.timeEn}
                    </p>
                  </div>

                  {/* Badge */}
                  <div
                    className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter"
                    style={{ background: isDark ? meta.bgDark : meta.bgLight, color: meta.color }}
                  >
                    {lang === 'ar' ? meta.labelAr : meta.labelEn}
                  </div>
                </div>
              )
            })
          )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div
        className="flex justify-center py-4 shrink-0"
        style={{ background: footerBg, borderTop: `1px solid ${divider}` }}
      >
        <button
          className="text-[10px] font-bold uppercase tracking-widest transition-colors"
          style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#458482'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = textMuted}
        >
          {lang === 'ar' ? 'عرض كل الأحداث' : 'View all activity'}
        </button>
      </div>
    </div>
  )
}