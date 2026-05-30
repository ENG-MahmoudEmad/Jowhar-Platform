"use client";

import React, { memo, useMemo, useState } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import { Activity, AlertCircle, CheckCheck, MessageSquare, Paperclip, UserPlus } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

type EventType = 'completed' | 'comment' | 'file' | 'joined' | 'overdue';
type FeedFilter = EventType | 'all';
type Lang = 'en' | 'ar';
type ActivityStyle = React.CSSProperties & Partial<Record<`--activity-${string}`, string>>;

interface FeedEvent {
  id: number;
  type: EventType;
  member: string;
  memberColor: string;
  memberInitials: string;
  taskEn: string;
  taskAr: string;
  timeEn: string;
  timeAr: string;
}

const EVENTS: FeedEvent[] = [
  { id: 1, type: 'completed', member: 'Tweeflue', memberColor: '#a855f7', memberInitials: 'TW', taskEn: 'Landing page redesign', taskAr: 'إعادة تصميم الصفحة الرئيسية', timeEn: '2m ago', timeAr: 'منذ 2 د' },
  { id: 2, type: 'comment', member: 'Omar', memberColor: '#ef4444', memberInitials: 'OM', taskEn: 'API integration review', taskAr: 'مراجعة تكامل API', timeEn: '8m ago', timeAr: 'منذ 8 د' },
  { id: 3, type: 'file', member: 'Medoma', memberColor: '#3b82f6', memberInitials: 'MD', taskEn: 'Brand assets v3', taskAr: 'أصول العلامة v3', timeEn: '15m ago', timeAr: 'منذ 15 د' },
  { id: 4, type: 'completed', member: 'Yahya', memberColor: '#10b981', memberInitials: 'YH', taskEn: 'CI/CD pipeline setup', taskAr: 'إعداد خط CI/CD', timeEn: '32m ago', timeAr: 'منذ 32 د' },
  { id: 5, type: 'overdue', member: 'Yehia', memberColor: '#f97316', memberInitials: 'YE', taskEn: 'Push notification module', taskAr: 'وحدة الإشعارات الفورية', timeEn: '1h ago', timeAr: 'منذ 1 س' },
  { id: 6, type: 'joined', member: 'Sara', memberColor: '#ec4899', memberInitials: 'SR', taskEn: 'QA Sprint 4', taskAr: 'سبرينت QA 4', timeEn: '1h ago', timeAr: 'منذ 1 س' },
  { id: 7, type: 'comment', member: 'Ahmed', memberColor: '#2563eb', memberInitials: 'AH', taskEn: 'Dashboard analytics', taskAr: 'تحليلات لوحة التحكم', timeEn: '2h ago', timeAr: 'منذ 2 س' },
  { id: 8, type: 'completed', member: 'Lina', memberColor: '#7c3aed', memberInitials: 'LN', taskEn: 'Content calendar Q3', taskAr: 'تقويم المحتوى Q3', timeEn: '3h ago', timeAr: 'منذ 3 س' },
  { id: 9, type: 'file', member: 'KB', memberColor: '#f59e0b', memberInitials: 'KB', taskEn: 'Architecture diagrams', taskAr: 'مخططات المعمارية', timeEn: '4h ago', timeAr: 'منذ 4 س' },
  { id: 10, type: 'overdue', member: 'Tarek', memberColor: '#c2410c', memberInitials: 'TK', taskEn: 'Cloud migration phase 2', taskAr: 'مرحلة 2 من الهجرة السحابية', timeEn: '5h ago', timeAr: 'منذ 5 س' },
];

const EVENT_META: Record<EventType, {
  icon: React.ElementType;
  color: string;
  bgLight: string;
  bgDark: string;
  labelEn: string;
  labelAr: string;
  sentenceEn: (task: string) => string;
  sentenceAr: (task: string) => string;
}> = {
  completed: {
    icon: CheckCheck,
    color: '#10b981',
    bgLight: 'rgba(16,185,129,0.1)',
    bgDark: 'rgba(16,185,129,0.12)',
    labelEn: 'Completed',
    labelAr: 'مكتملة',
    sentenceEn: (task) => `completed "${task}"`,
    sentenceAr: (task) => `أكمل "${task}"`,
  },
  comment: {
    icon: MessageSquare,
    color: '#3b82f6',
    bgLight: 'rgba(59,130,246,0.1)',
    bgDark: 'rgba(59,130,246,0.12)',
    labelEn: 'Comments',
    labelAr: 'تعليقات',
    sentenceEn: (task) => `commented on "${task}"`,
    sentenceAr: (task) => `علّق على "${task}"`,
  },
  file: {
    icon: Paperclip,
    color: '#f59e0b',
    bgLight: 'rgba(245,158,11,0.1)',
    bgDark: 'rgba(245,158,11,0.12)',
    labelEn: 'Files',
    labelAr: 'ملفات',
    sentenceEn: (task) => `uploaded a file to "${task}"`,
    sentenceAr: (task) => `رفع ملفا في "${task}"`,
  },
  joined: {
    icon: UserPlus,
    color: '#458482',
    bgLight: 'rgba(69,132,130,0.1)',
    bgDark: 'rgba(69,132,130,0.12)',
    labelEn: 'Joined',
    labelAr: 'انضمام',
    sentenceEn: (task) => `joined "${task}"`,
    sentenceAr: (task) => `انضم إلى "${task}"`,
  },
  overdue: {
    icon: AlertCircle,
    color: '#ef4444',
    bgLight: 'rgba(239,68,68,0.1)',
    bgDark: 'rgba(239,68,68,0.12)',
    labelEn: 'Overdue',
    labelAr: 'متأخرة',
    sentenceEn: (task) => `task "${task}" is overdue`,
    sentenceAr: (task) => `مهمة "${task}" متأخرة`,
  },
};

const ALL_TYPES: EventType[] = ['completed', 'comment', 'file', 'joined', 'overdue'];

const CARD_TRANSITION = {
  delay: 0.32,
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const TEXT = {
  en: {
    title: 'Activity Feed',
    subtitle: 'Team activity',
    live: 'Live',
    all: 'All',
    empty: 'No events found',
    viewAll: 'View all activity',
  },
  ar: {
    title: 'آخر الأحداث',
    subtitle: 'نشاط الفريق',
    live: 'مباشر',
    all: 'الكل',
    empty: 'لا توجد أحداث حاليا',
    viewAll: 'عرض كل الأحداث',
  },
} satisfies Record<Lang, Record<'title' | 'subtitle' | 'live' | 'all' | 'empty' | 'viewAll', string>>;

function getPalette(isDark: boolean): ActivityStyle {
  return {
    '--activity-bg': isDark ? 'var(--card)' : '#ffffff',
    '--activity-border': isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)',
    '--activity-header-bg': isDark ? 'var(--background-alt)' : '#f5f5ef',
    '--activity-divider': isDark ? 'var(--divider)' : 'rgba(0,0,0,0.06)',
    '--activity-text-main': 'var(--foreground)',
    '--activity-text-muted': 'var(--foreground-muted)',
    '--activity-footer-bg': isDark ? 'rgba(13,17,23,0.5)' : 'rgba(249,249,243,0.8)',
    '--activity-chip-bg': isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    '--activity-chip-count-bg': isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    '--activity-row-hover': isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
    background: 'var(--activity-bg)',
    border: '1px solid var(--activity-border)',
  };
}

function ActivityFeed() {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';
  const copy = TEXT[lang];
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');

  const palette = useMemo(() => getPalette(isDark), [isDark]);
  const counts = useMemo(() => {
    const next = Object.fromEntries(ALL_TYPES.map((type) => [type, 0])) as Record<EventType, number>;
    EVENTS.forEach((event) => { next[event.type] += 1; });
    return next;
  }, []);
  const filters = useMemo(
    () => [
      { key: 'all' as const, label: copy.all, count: EVENTS.length, color: '#458482' },
      ...ALL_TYPES.map((type) => ({
        key: type,
        label: lang === 'ar' ? EVENT_META[type].labelAr : EVENT_META[type].labelEn,
        count: counts[type],
        color: EVENT_META[type].color,
      })),
    ],
    [copy.all, counts, lang],
  );
  const filtered = useMemo(
    () => (activeFilter === 'all' ? EVENTS : EVENTS.filter((event) => event.type === activeFilter)),
    [activeFilter],
  );

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        initial={{ opacity: 0, y: 22, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={CARD_TRANSITION}
        dir={isRTL ? 'rtl' : 'ltr'}
        aria-labelledby="activity-feed-title"
        className="flex h-[372px] w-full flex-col overflow-hidden rounded-2xl shadow-sm"
        style={palette}
      >
        <div className="flex shrink-0 items-center justify-between p-5 bg-[var(--activity-header-bg)] border-b border-[var(--activity-divider)]">
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-lg bg-[rgba(69,132,130,0.1)] p-2">
              <Activity size={18} className="text-[#458482]" aria-hidden="true" />
            </div>
            <div className="text-start">
              <h2
                id="activity-feed-title"
                className="text-sm font-bold uppercase tracking-widest text-[var(--activity-text-main)]"
                style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
              >
                {copy.title}
              </h2>
              <p className="mt-0.5 text-[10px] font-medium text-[var(--activity-text-muted)]">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5" aria-label={copy.live}>
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10b981] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10b981]" />
            </span>
            <span className="text-[10px] font-semibold text-[#10b981]">
              {copy.live}
            </span>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-2 overflow-x-auto px-4 py-3 border-b border-[var(--activity-divider)]"
          role="tablist"
          aria-label={copy.title}
        >
          {filters.map(({ key, label, count, color }) => {
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(key)}
                className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors"
                style={{
                  background: isActive ? color : 'var(--activity-chip-bg)',
                  color: isActive ? '#fff' : 'var(--activity-text-muted)',
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                }}
              >
                {label}
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--activity-chip-count-bg)',
                    color: isActive ? '#fff' : 'var(--activity-text-muted)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={activeFilter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              {filtered.length === 0 ? (
                <div
                  className="flex h-full items-center justify-center py-12 text-[12px] text-[var(--activity-text-muted)]"
                  style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                >
                  {copy.empty}
                </div>
              ) : (
                filtered.map((event) => {
                  const meta = EVENT_META[event.type];
                  const Icon = meta.icon;
                  const task = lang === 'ar' ? event.taskAr : event.taskEn;

                  return (
                    <article
                      key={event.id}
                      className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-[var(--activity-row-hover)] border-b border-[var(--activity-divider)]"
                    >
                      <div
                        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ background: event.memberColor, boxShadow: `0 4px 10px ${event.memberColor}33` }}
                        aria-hidden="true"
                      >
                        {event.memberInitials}
                        <div
                          className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2"
                          style={{ background: meta.color, borderColor: 'var(--activity-bg)' }}
                        >
                          <Icon size={8} color="#fff" aria-hidden="true" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 pt-0.5 text-start">
                        <p
                          className="text-[12px] leading-snug text-[var(--activity-text-muted)]"
                          style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                        >
                          <span className="font-semibold text-[var(--activity-text-main)]">{event.member}</span>{' '}
                          {lang === 'ar' ? meta.sentenceAr(task) : meta.sentenceEn(task)}
                        </p>
                        <p className="mt-1 text-[10px] font-medium text-[var(--activity-text-muted)] opacity-60">
                          {lang === 'ar' ? event.timeAr : event.timeEn}
                        </p>
                      </div>

                      <div
                        className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter"
                        style={{ background: isDark ? meta.bgDark : meta.bgLight, color: meta.color }}
                      >
                        {lang === 'ar' ? meta.labelAr : meta.labelEn}
                      </div>
                    </article>
                  );
                })
              )}
            </m.div>
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 justify-center py-4 bg-[var(--activity-footer-bg)] border-t border-[var(--activity-divider)]">
          <button
            type="button"
            className="text-[10px] font-bold uppercase tracking-widest text-[var(--activity-text-muted)] transition-colors hover:text-[#458482]"
            style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {copy.viewAll}
          </button>
        </div>
      </m.section>
    </LazyMotion>
  );
}

export default memo(ActivityFeed);
