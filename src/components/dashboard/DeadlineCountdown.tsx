"use client"

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

/* ─── Types ─── */
interface Deadline {
  id:        number;
  title:     string;
  titleAr:   string;
  deadline:  Date;
  baseColor: string;
  totalMs:   number;
}

const fromNow = (h: number) => new Date(Date.now() + h * 3_600_000);
const WINDOW  = (h: number) => h * 3_600_000;
const DOTS_VIS = 4;

const DEADLINES: Deadline[] = [
  { id: 1, title: 'Character Rigging', titleAr: 'تحريك الشخصية', deadline: fromNow(32),  baseColor: '#458482', totalMs: WINDOW(40) },
  { id: 2, title: 'Storyboard Final',  titleAr: 'القصة المصوّرة',  deadline: fromNow(51),  baseColor: '#3b82f6', totalMs: WINDOW(60) },
  { id: 3, title: 'VFX Compositing',   titleAr: 'تركيب المؤثرات', deadline: fromNow(3.5), baseColor: '#a855f7', totalMs: WINDOW(10) },
  { id: 4, title: 'Sound Design',      titleAr: 'تصميم الصوت',    deadline: fromNow(0.5), baseColor: '#6366f1', totalMs: WINDOW(5)  },
  { id: 5, title: 'Color Grading',     titleAr: 'تصحيح الألوان',  deadline: fromNow(12),  baseColor: '#14b8a6', totalMs: WINDOW(20) },
  { id: 6, title: 'Motion Graphics',   titleAr: 'رسوم متحركة',    deadline: fromNow(8),   baseColor: '#8b5cf6', totalMs: WINDOW(24) },
];

type Urgency = 'safe' | 'warning' | 'danger';

function getUrgency(dl: Deadline): Urgency {
  const remaining = dl.deadline.getTime() - Date.now();
  const pct       = 1 - remaining / dl.totalMs;
  if (pct >= 0.85) return 'danger';
  if (pct >= 0.50) return 'warning';
  return 'safe';
}

function urgencyColor(u: Urgency, base: string) {
  if (u === 'danger')  return '#ef4444';
  if (u === 'warning') return '#f59e0b';
  return base;
}
function urgencyGlow(u: Urgency, base: string) {
  if (u === 'danger')  return 'rgba(239,68,68,0.4)';
  if (u === 'warning') return 'rgba(245,158,11,0.4)';
  return `${base}55`;
}

/* ─── SVG Ring ─── */
const R    = 68;
const SW   = 7;
const CIRC = 2 * Math.PI * R;

function Ring({ progress, color, glow }: { progress: number; color: string; glow: string }) {
  const offset = CIRC * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <svg width="170" height="170" viewBox="0 0 170 170"
      style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
      <circle cx="85" cy="85" r={R} fill="none" stroke="rgba(128,128,128,0.1)" strokeWidth={SW}/>
      <circle cx="85" cy="85" r={R} fill="none"
        stroke={color} strokeWidth={SW} strokeLinecap="round"
        strokeDasharray={CIRC} strokeDashoffset={offset}
        style={{
          transition: 'stroke-dashoffset 1s linear, stroke 0.6s ease',
          filter: `drop-shadow(0 0 7px ${glow})`,
        }}
      />
    </svg>
  );
}

/* ─── Component ─── */
export default function DeadlineCountdown() {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';

  const [activeIdx, setActiveIdx] = useState(0);
  const [dotOffset, setDotOffset] = useState(0);
  const [hovered,   setHovered]   = useState(false);
  const [, setTick]               = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const total = DEADLINES.length;

  const goTo = (idx: number) => {
    const next = ((idx % total) + total) % total;
    setActiveIdx(next);
    if (next < dotOffset) setDotOffset(next);
    else if (next >= dotOffset + DOTS_VIS) setDotOffset(next - DOTS_VIS + 1);
  };

  const goPrev = () => goTo(activeIdx - 1);
  const goNext = () => goTo(activeIdx + 1);

  const dl        = DEADLINES[activeIdx];
  const remaining = Math.max(0, dl.deadline.getTime() - Date.now());
  const progress  = 1 - remaining / dl.totalMs;
  const urgency   = getUrgency(dl);
  const color     = urgencyColor(urgency, dl.baseColor);
  const glow      = urgencyGlow(urgency, dl.baseColor);

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1_000);
  const p = (n: number) => String(n).padStart(2, '0');

  /* palette */
  const bg       = isDark ? 'var(--card)'           : '#ffffff';
  const border   = isDark ? 'var(--card-border)'    : 'rgba(0,0,0,0.07)';
  const headerBg = isDark ? 'var(--background-alt)' : '#f5f5ef';
  const divider  = isDark ? 'var(--divider)'        : 'rgba(0,0,0,0.06)';
  const innerBg  = isDark ? '#0a0f1a'               : '#f0f0e8';
  const textMain = 'var(--foreground)';
  const textMuted= 'var(--foreground-muted)';
  const arrowBg  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const tx = {
    for:      lang === 'ar' ? 'الموعد النهائي لـ' : 'Deadline for',
    expired:  lang === 'ar' ? 'انتهى!'            : "Time's up!",
    critical: lang === 'ar' ? '⚠ عاجل'            : '⚠ Critical',
    soon:     lang === 'ar' ? '⏳ قريباً'           : '⏳ Soon',
    hu:       lang === 'ar' ? 'س' : 'h',
    mu:       lang === 'ar' ? 'د' : 'm',
    su:       lang === 'ar' ? 'ث' : 's',
  };

  const visibleDots = DEADLINES.slice(dotOffset, dotOffset + DOTS_VIS);
  const hasMore     = total > DOTS_VIS;

  return (
    /* 
      Fixed height layout so ring never shifts:
      - header: fixed
      - ring area: fixed height
      - badge area: fixed height (reserved always)
      - dots: fixed
    */
    <div
      className="w-full rounded-2xl overflow-hidden flex flex-col relative"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        /* no user-select anywhere inside */
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >

      {/* ─── Hover arrows ─── */}
      <AnimatePresence>
        {hovered && (
          <>
            <motion.button key="prev"
              initial={{ opacity: 0, x: isRTL ? 8 : -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 8 : -8 }}
              transition={{ duration: 0.15 }}
              onClick={isRTL ? goNext : goPrev}
              className="absolute z-20 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{
                top: '50%', transform: 'translateY(-50%)',
                left: isRTL ? 'auto' : '10px',
                right: isRTL ? '10px' : 'auto',
                background: arrowBg, color: textMuted, border: `1px solid ${divider}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = textMain; }}
              onMouseLeave={e => { e.currentTarget.style.background = arrowBg; e.currentTarget.style.color = textMuted; }}
            >
              {isRTL ? <ChevronRight className="w-4 h-4"/> : <ChevronLeft className="w-4 h-4"/>}
            </motion.button>

            <motion.button key="next"
              initial={{ opacity: 0, x: isRTL ? -8 : 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? -8 : 8 }}
              transition={{ duration: 0.15 }}
              onClick={isRTL ? goPrev : goNext}
              className="absolute z-20 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{
                top: '50%', transform: 'translateY(-50%)',
                right: isRTL ? 'auto' : '10px',
                left: isRTL ? '10px' : 'auto',
                background: arrowBg, color: textMuted, border: `1px solid ${divider}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = textMain; }}
              onMouseLeave={e => { e.currentTarget.style.background = arrowBg; e.currentTarget.style.color = textMuted; }}
            >
              {isRTL ? <ChevronLeft className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
            </motion.button>
          </>
        )}
      </AnimatePresence>

      {/* ─── Header ─── */}
      <div className="px-5 py-4 shrink-0"
        style={{ background: headerBg, borderBottom: `1px solid ${divider}` }}>
        <p className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: textMuted, textAlign: isRTL ? 'right' : 'left',
            fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
          {tx.for}
        </p>
        <AnimatePresence mode="wait">
          <motion.h3 key={dl.id}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-bold mt-0.5 truncate"
            style={{
              /* task title uses the current urgency color */
              color: color,
              textAlign: isRTL ? 'right' : 'left',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            }}>
            {lang === 'ar' ? dl.titleAr : dl.title}
          </motion.h3>
        </AnimatePresence>
      </div>

      {/* ─── Ring area — fixed height so nothing shifts ─── */}
      <div className="flex flex-col items-center justify-center px-3"
        style={{ height: '220px', flexShrink: 0 }}>

        <AnimatePresence mode="wait">
          <motion.div key={dl.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center justify-center"
            style={{ width: 170, height: 170, flexShrink: 0 }}>

            <Ring progress={progress} color={color} glow={glow} />

            <div className="relative z-10 w-[118px] h-[118px] rounded-full flex flex-col items-center justify-center"
              style={{ background: innerBg, boxShadow: `0 0 32px ${glow}, inset 0 1px 0 rgba(255,255,255,0.04)` }}>
              {remaining > 0 ? (
                <>
                  <span className="text-[22px] font-black font-mono leading-none tabular-nums"
                    style={{ color, letterSpacing: '-0.03em' }}>
                    {p(h)}:{p(m)}
                  </span>
                  <span className="text-sm font-bold font-mono tabular-nums mt-0.5"
                    style={{ color, opacity: 0.75 }}>
                    {p(s)}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {[tx.hu, tx.mu, tx.su].map((lbl, i) => (
                      <span key={i} className="text-[8px] font-black uppercase"
                        style={{ color: textMuted }}>{lbl}</span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-wide text-center px-3"
                  style={{ color: '#ef4444' }}>
                  {tx.expired}
                </span>
              )}
            </div>

            {urgency !== 'safe' && (
              <motion.div className="absolute inset-0 rounded-full pointer-events-none"
                animate={{ opacity: [0.1, 0.5, 0.1], scale: [1, 1.04, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ border: `2px solid ${color}`, borderRadius: '50%' }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Badge area — FIXED HEIGHT always reserved ─── */}
      <div className="flex items-center justify-center shrink-0" style={{ height: '32px' }}>
        <AnimatePresence mode="wait">
          {urgency !== 'safe' ? (
            <motion.div key="badge"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
              style={{
                background: urgency === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                color:      urgency === 'danger' ? '#ef4444'              : '#f59e0b',
                border:     `1px solid ${urgency === 'danger' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
              }}>
              {urgency === 'danger' ? tx.critical : tx.soon}
            </motion.div>
          ) : (
            /* invisible placeholder keeps the space */
            <motion.div key="empty" className="h-6 w-1 opacity-0" />
          )}
        </AnimatePresence>
      </div>

      {/* ─── Dots ─── */}
      <div className="pb-5 pt-2 flex flex-col items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">

          {hasMore && dotOffset > 0 && (
            <div className="w-1.5 h-1.5 rounded-full opacity-20" style={{ background: textMuted }}/>
          )}

          <AnimatePresence mode="popLayout">
            {visibleDots.map((item) => {
              const urg   = getUrgency(item);
              const clr   = urgencyColor(urg, item.baseColor);
              const isAct = item.id === dl.id;
              const gIdx  = DEADLINES.findIndex(d => d.id === item.id);
              return (
                <motion.button key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: isAct ? 1 : 0.35, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  onClick={() => goTo(gIdx)}
                  className="cursor-pointer rounded-full shrink-0"
                  style={{
                    width: isAct ? 22 : 8, height: 8,
                    background: clr,
                    boxShadow: isAct ? `0 0 8px ${clr}80` : 'none',
                    transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1)',
                  }}
                />
              );
            })}
          </AnimatePresence>

          {hasMore && dotOffset + DOTS_VIS < total && (
            <div className="w-1.5 h-1.5 rounded-full opacity-20" style={{ background: textMuted }}/>
          )}
        </div>

        <span className="text-[9px] font-bold" style={{ color: textMuted }}>
          {activeIdx + 1} / {total}
        </span>
      </div>
    </div>
  );
}