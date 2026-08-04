"use client";

import React, { memo, useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { useSwipeNavigate } from '@/hooks/useSwipeNavigate';

type Lang = 'en' | 'ar';
type Urgency = 'safe' | 'warning' | 'danger';

// ─────────────────────────────────────────────────────────────────────────────
// Data shape — matches what the server (page.tsx) hands down after mapping
// the raw `get_my_deadlines()` RPC row + the shared priority color lookup.
// This component knows nothing about Supabase or task tables.
// ─────────────────────────────────────────────────────────────────────────────
export type DeadlineData = {
  id: string;
  title: string;
  color: string; // resolved from priority via lib/priorityColors
  deadlineAt: number; // epoch ms
  windowMs: number;
};

type CountdownStyle = React.CSSProperties & Partial<Record<`--deadline-${string}`, string>>;
type DotStyle = React.CSSProperties & Partial<Record<'--dot-color', string>>;

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const SECOND_MS = 1_000;
const DAY_MS = 86_400_000;
const DOTS_VISIBLE = 4;
const RING_RADIUS = 68;
const RING_STROKE = 7;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface DeadlineCountdownProps {
  deadlines: DeadlineData[];
}

const CARD_TRANSITION = {
  delay: 0.18,
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const TEXT = {
  en: {
    for: 'Deadline for',
    expired: "Time's up!",
    critical: 'Critical',
    soon: 'Soon',
    days: 'd',
    hours: 'h',
    minutes: 'm',
    seconds: 's',
    previous: 'Previous deadline',
    next: 'Next deadline',
    empty: 'No open deadlines right now',
  },
  ar: {
    for: 'الموعد النهائي لـ',
    expired: 'انتهى!',
    critical: 'عاجل',
    soon: 'قريبا',
    days: 'ي',
    hours: 'س',
    minutes: 'د',
    seconds: 'ث',
    previous: 'الموعد السابق',
    next: 'الموعد التالي',
    empty: 'ما في مواعيد نهائية مفتوحة حاليًا',
  },
} satisfies Record<Lang, Record<'for' | 'expired' | 'critical' | 'soon' | 'days' | 'hours' | 'minutes' | 'seconds' | 'previous' | 'next' | 'empty', string>>;

function subscribeToClientReady(callback: () => void) {
  callback();
  return () => {};
}

function useClientReady() {
  return useSyncExternalStore(
    subscribeToClientReady,
    () => true,
    () => false,
  );
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function getUrgency(remaining: number, windowMs: number): Urgency {
  const elapsedPct = windowMs > 0 ? 1 - remaining / windowMs : 1;
  if (elapsedPct >= 0.85) return 'danger';
  if (elapsedPct >= 0.5) return 'warning';
  return 'safe';
}

function urgencyColor(urgency: Urgency, base: string) {
  if (urgency === 'danger') return '#ef4444';
  if (urgency === 'warning') return '#f59e0b';
  return base;
}

function urgencyGlow(urgency: Urgency, base: string) {
  if (urgency === 'danger') return 'rgba(239,68,68,0.4)';
  if (urgency === 'warning') return 'rgba(245,158,11,0.4)';
  return `${base}55`;
}

function getPalette(isDark: boolean): CountdownStyle {
  return {
    '--deadline-bg': isDark ? 'var(--card)' : '#ffffff',
    '--deadline-border': isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)',
    '--deadline-header-bg': isDark ? 'var(--background-alt)' : '#f5f5ef',
    '--deadline-divider': isDark ? 'var(--divider)' : 'rgba(0,0,0,0.06)',
    '--deadline-inner-bg': isDark ? '#0a0f1a' : '#f0f0e8',
    '--deadline-text-main': 'var(--foreground)',
    '--deadline-text-muted': 'var(--foreground-muted)',
    '--deadline-arrow-bg': isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    '--deadline-arrow-hover': isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    background: 'var(--deadline-bg)',
    border: '1px solid var(--deadline-border)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };
}

function formatRemaining(remaining: number) {
  const days = Math.floor(remaining / DAY_MS);
  const hours = Math.floor((remaining % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((remaining % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((remaining % MINUTE_MS) / SECOND_MS);
  const pad = (value: number) => String(value).padStart(2, '0');

  return {
    days,
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
  };
}

const Ring = memo(function Ring({
  progress,
  color,
  glow,
}: {
  progress: number;
  color: string;
  glow: string;
}) {
  const offset = RING_CIRCUMFERENCE * (1 - clamp01(progress));

  return (
    <svg
      width="170"
      height="170"
      viewBox="0 0 170 170"
      aria-hidden="true"
      className="absolute inset-0 -rotate-90"
    >
      <circle cx="85" cy="85" r={RING_RADIUS} fill="none" stroke="rgba(128,128,128,0.1)" strokeWidth={RING_STROKE} />
      <circle
        cx="85"
        cy="85"
        r={RING_RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        style={{
          transition: 'stroke-dashoffset 1s linear, stroke 0.6s ease',
          filter: `drop-shadow(0 0 7px ${glow})`,
        }}
      />
    </svg>
  );
});

function DeadlineCountdown({ deadlines }: DeadlineCountdownProps) {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';
  const copy = TEXT[lang];
  const isClientReady = useClientReady();
  const [activeIdx, setActiveIdx] = useState(0);
  const [dotOffset, setDotOffset] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [now, setNow] = useState(0);

  React.useEffect(() => {
    if (!isClientReady) return;
    const intervalId = window.setInterval(() => setNow(Date.now()), SECOND_MS);
    return () => window.clearInterval(intervalId);
  }, [isClientReady]);

  const palette = useMemo(() => getPalette(isDark), [isDark]);
  const total = deadlines.length;

  const goTo = useCallback((idx: number) => {
    if (total === 0) return;
    const next = ((idx % total) + total) % total;
    setActiveIdx(next);
    setDotOffset((current) => {
      if (next < current) return next;
      if (next >= current + DOTS_VISIBLE) return next - DOTS_VISIBLE + 1;
      return current;
    });
  }, [total]);

  const step = useCallback((direction: 1 | -1) => {
    if (total === 0) return;
    setActiveIdx((current) => {
      const next = ((current + direction) % total + total) % total;
      setDotOffset((offset) => {
        if (next < offset) return next;
        if (next >= offset + DOTS_VISIBLE) return next - DOTS_VISIBLE + 1;
        return offset;
      });
      return next;
    });
  }, [total]);

  // Swipe / drag / trackpad navigation between deadlines.
  // No native horizontal scrolling here, so every horizontal gesture navigates.
  const { ref: swipeRef, swipeHandlers, swipeStyle } = useSwipeNavigate({
    onNavigate: step,
  });

  if (!isClientReady) {
    return (
      <LazyMotion features={domAnimation}>
        <m.section
          initial={{ opacity: 0, y: 22, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={CARD_TRANSITION}
          className="flex w-full flex-col overflow-hidden rounded-2xl"
          dir={isRTL ? 'rtl' : 'ltr'}
          style={palette}
          aria-busy="true"
        >
          <div className="shrink-0 px-5 py-4 bg-[var(--deadline-header-bg)] border-b border-[var(--deadline-divider)]">
            <p className="text-start text-[10px] font-bold uppercase tracking-widest text-[var(--deadline-text-muted)]">
              {copy.for}
            </p>
            <div className="mt-1 h-4 w-32 rounded bg-[var(--hover-bg)]" />
          </div>
          <div className="flex h-[220px] flex-col items-center justify-center">
            <div className="h-[170px] w-[170px] rounded-full bg-[var(--hover-bg)] opacity-30" />
          </div>
          <div className="h-8" />
          <div className="flex h-12 justify-center pb-5" />
        </m.section>
      </LazyMotion>
    );
  }

  if (total === 0) {
    return (
      <LazyMotion features={domAnimation}>
        <m.section
          initial={{ opacity: 0, y: 22, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={CARD_TRANSITION}
          dir={isRTL ? 'rtl' : 'ltr'}
          className="flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl px-5 py-10 text-center"
          style={palette}
        >
          <p
            className="text-xs font-medium text-[var(--deadline-text-muted)]"
            style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {copy.empty}
          </p>
        </m.section>
      </LazyMotion>
    );
  }

  const activeDeadline = deadlines[activeIdx];
  const currentNow = now || Date.now();
  const remaining = Math.max(0, activeDeadline.deadlineAt - currentNow);
  const progress = activeDeadline.windowMs > 0 ? 1 - remaining / activeDeadline.windowMs : 1;
  const urgency = getUrgency(remaining, activeDeadline.windowMs);
  const color = urgencyColor(urgency, activeDeadline.color);
  const glow = urgencyGlow(urgency, activeDeadline.color);
  const time = formatRemaining(remaining);
  const visibleDots = deadlines.slice(dotOffset, dotOffset + DOTS_VISIBLE);
  const hasMore = total > DOTS_VISIBLE;

  const navButtons = [
    {
      key: 'prev',
      label: copy.previous,
      onClick: () => goTo(activeIdx - 1),
      side: isRTL ? { right: 10 } : { left: 10 },
      Icon: isRTL ? ChevronRight : ChevronLeft,
    },
    {
      key: 'next',
      label: copy.next,
      onClick: () => goTo(activeIdx + 1),
      side: isRTL ? { left: 10 } : { right: 10 },
      Icon: isRTL ? ChevronLeft : ChevronRight,
    },
  ];

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        initial={{ opacity: 0, y: 22, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={CARD_TRANSITION}
        dir={isRTL ? 'rtl' : 'ltr'}
        aria-labelledby="deadline-countdown-title"
        className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl"
        style={{ ...palette, ...swipeStyle }}
        ref={swipeRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        {...swipeHandlers}
      >
        <AnimatePresence>
          {hovered && total > 1 && (
            <>
              {navButtons.map(({ key, label, onClick, side, Icon }) => (
                <m.button
                  key={key}
                  type="button"
                  aria-label={label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={onClick}
                  className="absolute z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--deadline-divider)] bg-[var(--deadline-arrow-bg)] text-[var(--deadline-text-muted)] transition-colors hover:bg-[var(--deadline-arrow-hover)] hover:text-[var(--deadline-text-main)]"
                  style={{ top: '50%', transform: 'translateY(-50%)', ...side }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </m.button>
              ))}
            </>
          )}
        </AnimatePresence>

        <div className="shrink-0 px-5 py-4 bg-[var(--deadline-header-bg)] border-b border-[var(--deadline-divider)]">
          <p
            className="text-start text-[10px] font-bold uppercase tracking-widest text-[var(--deadline-text-muted)]"
            style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {copy.for}
          </p>
          <AnimatePresence mode="wait">
            <m.h3
              key={activeDeadline.id}
              id="deadline-countdown-title"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="mt-0.5 truncate text-start text-sm font-bold"
              style={{ color, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {activeDeadline.title}
            </m.h3>
          </AnimatePresence>
        </div>

        <div className="flex h-[220px] shrink-0 flex-col items-center justify-center px-3">
          <AnimatePresence mode="wait">
            <m.div
              key={activeDeadline.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex h-[170px] w-[170px] shrink-0 items-center justify-center"
            >
              <Ring progress={progress} color={color} glow={glow} />
              <div
                className="relative z-10 flex h-[118px] w-[118px] flex-col items-center justify-center rounded-full bg-[var(--deadline-inner-bg)]"
                style={{ boxShadow: `0 0 32px ${glow}, inset 0 1px 0 rgba(255,255,255,0.04)` }}
              >
                {remaining > 0 ? (
                  time.days > 0 ? (
                    <>
                      <span className="font-mono text-[19px] font-black leading-none tabular-nums" style={{ color }}>
                        {time.days}{copy.days} {time.hours}{copy.hours}
                      </span>
                      <span className="mt-1 font-mono text-xs font-bold tabular-nums" style={{ color, opacity: 0.75 }}>
                        {time.minutes}{copy.minutes} {time.seconds}{copy.seconds}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-[22px] font-black leading-none tabular-nums" style={{ color }}>
                        {time.hours}:{time.minutes}
                      </span>
                      <span className="mt-0.5 font-mono text-sm font-bold tabular-nums" style={{ color, opacity: 0.75 }}>
                        {time.seconds}
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        {[copy.hours, copy.minutes, copy.seconds].map((label) => (
                          <span key={label} className="text-[8px] font-black uppercase text-[var(--deadline-text-muted)]">
                            {label}
                          </span>
                        ))}
                      </div>
                    </>
                  )
                ) : (
                  <span className="px-3 text-center text-[10px] font-black uppercase tracking-wide text-[#ef4444]">
                    {copy.expired}
                  </span>
                )}
              </div>
              {urgency !== 'safe' && (
                <m.div
                  className="pointer-events-none absolute inset-0 rounded-full"
                  animate={{ opacity: [0.1, 0.5, 0.1], scale: [1, 1.04, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ border: `2px solid ${color}` }}
                />
              )}
            </m.div>
          </AnimatePresence>
        </div>

        <div className="flex h-8 shrink-0 items-center justify-center">
          <AnimatePresence mode="wait">
            {urgency !== 'safe' ? (
              <m.div
                key="badge"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest"
                style={{
                  background: urgency === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                  color: urgency === 'danger' ? '#ef4444' : '#f59e0b',
                  border: `1px solid ${urgency === 'danger' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                }}
              >
                {urgency === 'danger' ? copy.critical : copy.soon}
              </m.div>
            ) : (
              <div key="empty" className="h-6 w-px opacity-0" />
            )}
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2 pb-5 pt-2">
          <div className="flex items-center gap-2">
            {hasMore && dotOffset > 0 && (
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--deadline-text-muted)] opacity-20" />
            )}
            <AnimatePresence mode="popLayout">
              {visibleDots.map((item) => {
                const itemRemaining = Math.max(0, item.deadlineAt - currentNow);
                const itemUrgency = getUrgency(itemRemaining, item.windowMs);
                const itemColor = urgencyColor(itemUrgency, item.color);
                const isActive = item.id === activeDeadline.id;
                const globalIndex = deadlines.findIndex((deadline) => deadline.id === item.id);
                const dotStyle: DotStyle = {
                  '--dot-color': itemColor,
                  width: isActive ? 22 : 8,
                  height: 8,
                  boxShadow: isActive ? `0 0 8px ${itemColor}80` : 'none',
                  transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1)',
                };

                return (
                  <m.button
                    key={item.id}
                    type="button"
                    aria-label={`${item.title} (${globalIndex + 1} / ${total})`}
                    aria-current={isActive ? 'true' : undefined}
                    layout
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: isActive ? 1 : 0.35, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    onClick={() => goTo(globalIndex)}
                    className="shrink-0 cursor-pointer rounded-full bg-[var(--dot-color)]"
                    style={dotStyle}
                  />
                );
              })}
            </AnimatePresence>
            {hasMore && dotOffset + DOTS_VISIBLE < total && (
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--deadline-text-muted)] opacity-20" />
            )}
          </div>
          <span className="text-[9px] font-bold text-[var(--deadline-text-muted)]">
            {activeIdx + 1} / {total}
          </span>
        </div>
      </m.section>
    </LazyMotion>
  );
}

export default memo(DeadlineCountdown);