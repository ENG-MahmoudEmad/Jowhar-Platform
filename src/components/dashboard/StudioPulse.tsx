"use client";

import React, { memo, useMemo } from 'react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { Sparkles, CheckCircle2, Flame, Gauge } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

type Lang = 'en' | 'ar';
type PulseStyle = React.CSSProperties & Partial<Record<`--pulse-${string}`, string>>;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DailyVerse = {
  id: number;
  surahNumber: number;
  ayahNumber: number;
  surahNameAr: string;
  surahNameEn: string;
  arabicText: string;
};

type MostActiveMember = {
  id: number;
  userId: number | null;
  name: string;
  initials: string;
  color: string;
  tasksCompleted: number;
};

type StudioPulseStats = {
  // Current studio month (Asia/Riyadh), matches My Tasks DONE counter & Leaderboard monthly window.
  tasksCompletedThisMonth: number;
  mostActiveMember: MostActiveMember;
  completionRatePct: number; // completed / total assigned this month, 0-100
};

// ─────────────────────────────────────────────────────────────────────────────
// TODO (backend wiring):
// Replace both mocks below with a single RPC, e.g. `get_studio_pulse()`,
// that returns { verse, stats } together so the client stays a pure renderer.
//
//   verse  → deterministic pick from `daily_verses`:
//            index = extract(doy from (now() at time zone 'Asia/Riyadh')) % count(*)
//            Same verse for the whole team on a given day.
//
//   stats  → studio-wide aggregation over the current calendar month in
//            Asia/Riyadh, sourced from `tasks` (status = 'done'), matching
//            the same month boundary used by My Tasks' DONE counter and the
//            Leaderboard's monthly period (see lesson: server-side, never
//            recomputed differently in two places).
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_VERSE: DailyVerse = {
  id: 1,
  surahNumber: 94,
  ayahNumber: 6,
  surahNameAr: 'الشرح',
  surahNameEn: 'Ash-Sharh',
  arabicText: 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
};

const MOCK_STATS: StudioPulseStats = {
  tasksCompletedThisMonth: 47,
  mostActiveMember: {
    id: 1,
    userId: 1,
    name: 'Ahmed',
    initials: 'AH',
    color: '#458482',
    tasksCompleted: 12,
  },
  completionRatePct: 78,
};

// Same thresholds as TeamProgress.getProgressColor — keep these in sync
// (ideally both should import one shared util once it exists, per lesson #9).
const RATE_COLOR_LOW = '#ef4444';
const RATE_COLOR_MID = '#f59e0b';
const RATE_COLOR_HIGH = '#458482';

function getRateColor(pct: number): string {
  if (pct < 40) return RATE_COLOR_LOW;
  if (pct < 70) return RATE_COLOR_MID;
  return RATE_COLOR_HIGH;
}

const CARD_TRANSITION = {
  delay: 0.32,
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const TEXT = {
  en: {
    title: 'Studio Pulse',
    subtitle: 'A verse for the day, and the month in numbers',
    verseRef: (surah: string, ayah: number) => `${surah} · ${ayah}`,
    completed: 'Completed this month',
    mostActive: 'Most active this month',
    tasksSuffix: (n: number) => `${n} tasks`,
    completionRate: 'Completion rate',
    renews: 'Renews daily',
  },
  ar: {
    title: 'نبض الاستوديو',
    subtitle: 'آية اليوم، وشهرك بالأرقام',
    verseRef: (surah: string, ayah: number) => `سورة ${surah} · ${ayah}`,
    completed: 'أُنجزت هالشهر',
    mostActive: 'الأنشط هالشهر',
    tasksSuffix: (n: number) => `${n} مهمة`,
    completionRate: 'نسبة الإنجاز',
    renews: 'تتجدد يوميًا',
  },
} satisfies Record<Lang, {
  title: string;
  subtitle: string;
  verseRef: (surah: string, ayah: number) => string;
  completed: string;
  mostActive: string;
  tasksSuffix: (n: number) => string;
  completionRate: string;
  renews: string;
}>;

function getPalette(isDark: boolean): PulseStyle {
  return {
    '--pulse-bg': isDark ? 'var(--card)' : '#ffffff',
    '--pulse-border': isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)',
    '--pulse-header-bg': isDark ? 'var(--background-alt)' : '#f5f5ef',
    '--pulse-divider': isDark ? 'var(--divider)' : 'rgba(0,0,0,0.06)',
    '--pulse-verse-bg': isDark
      ? 'linear-gradient(160deg, rgba(69,132,130,0.08), rgba(69,132,130,0.02))'
      : 'linear-gradient(160deg, rgba(69,132,130,0.06), rgba(69,132,130,0.01))',
    '--pulse-text-main': 'var(--foreground)',
    '--pulse-text-muted': 'var(--foreground-muted)',
    '--pulse-stat-bg': isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    '--pulse-stat-border': isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    background: 'var(--pulse-bg)',
    border: '1px solid var(--pulse-border)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };
}

const StatBlock = memo(function StatBlock({
  icon: Icon,
  iconColor,
  value,
  valueColor,
  label,
  lang,
}: {
  icon: React.ElementType;
  iconColor: string;
  value: React.ReactNode;
  valueColor?: string;
  label: string;
  lang: Lang;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl py-3 px-2 text-center"
      style={{
        background: 'var(--pulse-stat-bg)',
        border: '1px solid var(--pulse-stat-border)',
      }}
    >
      <Icon size={14} style={{ color: iconColor }} aria-hidden="true" />
      <span
        className="font-mono text-base font-black leading-none tabular-nums"
        style={{ color: valueColor ?? 'var(--pulse-text-main)' }}
      >
        {value}
      </span>
      <span
        className="text-[9px] font-bold uppercase tracking-tight text-[var(--pulse-text-muted)]"
        style={{
          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
          textTransform: lang === 'ar' ? 'none' : 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  );
});

function StudioPulse() {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';
  const copy = TEXT[lang];
  const palette = useMemo(() => getPalette(isDark), [isDark]);

  // TODO: replace with server data (see backend note above)
  const verse = MOCK_VERSE;
  const stats = MOCK_STATS;

  const rateColor = useMemo(() => getRateColor(stats.completionRatePct), [stats.completionRatePct]);
  const surahLabel = lang === 'ar' ? verse.surahNameAr : verse.surahNameEn;

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        initial={{ opacity: 0, y: 22, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={CARD_TRANSITION}
        dir={isRTL ? 'rtl' : 'ltr'}
        aria-labelledby="studio-pulse-title"
        className="flex h-[372px] w-full flex-col overflow-hidden rounded-2xl"
        style={palette}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 p-5 bg-[var(--pulse-header-bg)] border-b border-[var(--pulse-divider)]">
          <div className="shrink-0 rounded-lg bg-[rgba(69,132,130,0.1)] p-2">
            <Sparkles size={18} className="text-[#458482]" aria-hidden="true" />
          </div>
          <div className="min-w-0 text-start">
            <h2
              id="studio-pulse-title"
              className="text-sm font-bold uppercase tracking-widest text-[var(--pulse-text-main)]"
              style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {copy.title}
            </h2>
            <p className="mt-0.5 text-[10px] font-medium text-[var(--pulse-text-muted)]">
              {copy.subtitle}
            </p>
          </div>
        </div>

        {/* Verse of the day */}
        <div
          className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 px-6 py-4 text-center"
          style={{ background: 'var(--pulse-verse-bg)' }}
        >
          <m.p
            key={verse.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            dir="rtl"
            lang="ar"
            className="max-w-[92%] text-[19px] font-bold leading-[1.9] text-[var(--pulse-text-main)]"
            style={{ fontFamily: 'var(--font-arabic-quran)' }}
          >
            <span aria-hidden="true" className="text-[#458482]/60">﴿ </span>
            {verse.arabicText}
            <span aria-hidden="true" className="text-[#458482]/60"> ﴾</span>
          </m.p>
          <span
            className="rounded-full bg-[rgba(69,132,130,0.1)] px-2.5 py-1 text-[10px] font-bold text-[#458482]"
            style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {copy.verseRef(surahLabel, verse.ayahNumber)}
          </span>
        </div>

        {/* Monthly stats */}
        <div className="flex shrink-0 gap-2 border-t border-[var(--pulse-divider)] p-3">
          <StatBlock
            icon={CheckCircle2}
            iconColor="#458482"
            value={stats.tasksCompletedThisMonth}
            label={copy.completed}
            lang={lang}
          />
          <StatBlock
            icon={Flame}
            iconColor={stats.mostActiveMember.color}
            value={stats.mostActiveMember.initials}
            valueColor={stats.mostActiveMember.color}
            label={`${copy.mostActive} · ${copy.tasksSuffix(stats.mostActiveMember.tasksCompleted)}`}
            lang={lang}
          />
          <StatBlock
            icon={Gauge}
            iconColor={rateColor}
            value={`${stats.completionRatePct}%`}
            valueColor={rateColor}
            label={copy.completionRate}
            lang={lang}
          />
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-center py-2.5 border-t border-[var(--pulse-divider)]">
          <span
            className="text-[9px] font-semibold uppercase tracking-widest text-[var(--pulse-text-muted)] opacity-70"
            style={{
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              textTransform: lang === 'ar' ? 'none' : 'uppercase',
            }}
          >
            {copy.renews}
          </span>
        </div>
      </m.section>
    </LazyMotion>
  );
}

export default memo(StudioPulse);