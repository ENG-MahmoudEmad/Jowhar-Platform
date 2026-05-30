// src/components/dashboard/ProjectCalendar.tsx

"use client";

import React, { memo, useCallback, useMemo, useState } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

type View = 'weekly' | 'monthly' | 'mytasks';
type Lang = 'en' | 'ar';
type Direction = 1 | -1;

type Member = {
  id: number;
  name: string;
  nameAr: string;
  avatar: string;
  color: string;
};

type Task = {
  id: number;
  memberId: number;
  title: string;
  titleAr: string;
  start: Date;
  end: Date;
  color: string;
};

type PositionedTask = Task & {
  startPct: number;
  widthPct: number;
};

type CalendarStyle = React.CSSProperties & Partial<Record<`--calendar-${string}`, string>>;
type MemberStyle = React.CSSProperties & Partial<Record<'--member-color', string>>;
type TaskStyle = React.CSSProperties & Partial<Record<'--task-color', string>>;

const MEMBERS: Member[] = [
  { id: 1, name: 'Ahmed', nameAr: 'أحمد', avatar: 'AH', color: '#458482' },
  { id: 2, name: 'Sarah', nameAr: 'سارة', avatar: 'SA', color: '#f59e0b' },
  { id: 3, name: 'Tweeflue', nameAr: 'تويفلو', avatar: 'TW', color: '#a855f7' },
  { id: 4, name: 'Omar', nameAr: 'عمر', avatar: 'OM', color: '#ef4444' },
  { id: 5, name: 'Lina', nameAr: 'لينا', avatar: 'LI', color: '#3b82f6' },
];

const MY_MEMBER_ID = 1;
const ROW_H = 56;
const TRACK_H = 6;
const BAR_H = 18;
const MEMBER_COL = 'w-28 sm:w-36';

const CARD_TRANSITION = {
  delay: 0.12,
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const TASK_TRANSITION = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const TEXT = {
  en: {
    title: 'Calendar',
    weekly: 'Weekly',
    monthly: 'Monthly',
    mytasks: 'My Tasks',
    previous: 'Previous period',
    next: 'Next period',
  },
  ar: {
    title: 'التقويم',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    mytasks: 'مهامي',
    previous: 'الفترة السابقة',
    next: 'الفترة التالية',
  },
} satisfies Record<Lang, Record<'title' | 'weekly' | 'monthly' | 'mytasks' | 'previous' | 'next', string>>;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, offset: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + offset);
  return next;
}

const DEMO_BASE_DATE = startOfDay(new Date());

function d(offset: number): Date {
  return addDays(DEMO_BASE_DATE, offset);
}

const ALL_TASKS: Task[] = [
  { id: 1, memberId: 1, title: 'Character Rigging', titleAr: 'تحريك الشخصية', start: d(-3), end: d(2), color: '#458482' },
  { id: 2, memberId: 1, title: 'Walk Cycle', titleAr: 'دورة المشي', start: d(3), end: d(7), color: '#5ea8a4' },
  { id: 3, memberId: 2, title: '3D Environment', titleAr: 'بيئة ثلاثية', start: d(-1), end: d(4), color: '#f59e0b' },
  { id: 4, memberId: 2, title: 'Texture Mapping', titleAr: 'خرائط النسيج', start: d(5), end: d(10), color: '#f97316' },
  { id: 5, memberId: 3, title: 'Particle Effects', titleAr: 'تأثيرات الجسيمات', start: d(-2), end: d(6), color: '#a855f7' },
  { id: 6, memberId: 4, title: 'Motion Blur VFX', titleAr: 'تأثير التمويه', start: d(0), end: d(3), color: '#ef4444' },
  { id: 7, memberId: 4, title: 'Color Grading', titleAr: 'تصحيح الألوان', start: d(4), end: d(8), color: '#f43f5e' },
  { id: 8, memberId: 5, title: 'Concept Sketches', titleAr: 'رسومات أولية', start: d(-4), end: d(1), color: '#3b82f6' },
  { id: 9, memberId: 5, title: 'Storyboard', titleAr: 'القصة المصورة', start: d(2), end: d(9), color: '#6366f1' },
];

function getWeekDays(anchor: Date): Date[] {
  const start = startOfDay(anchor);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getMonthDays(anchor: Date): Date[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, index) => new Date(year, month, index + 1));
}

function getDayKey(date: Date): number {
  return startOfDay(date).getTime();
}

function getTaskPosition(task: Task, days: Date[], dayIndexByKey: Map<number, number>): Pick<PositionedTask, 'startPct' | 'widthPct'> | null {
  const totalDays = days.length;
  const rangeStart = days[0];
  const rangeEnd = days[totalDays - 1];

  if (getDayKey(task.end) < getDayKey(rangeStart) || getDayKey(task.start) > getDayKey(rangeEnd)) {
    return null;
  }

  const taskStart = getDayKey(task.start) < getDayKey(rangeStart) ? rangeStart : task.start;
  const taskEnd = getDayKey(task.end) > getDayKey(rangeEnd) ? rangeEnd : task.end;
  const startIdx = dayIndexByKey.get(getDayKey(taskStart)) ?? 0;
  const endIdx = dayIndexByKey.get(getDayKey(taskEnd)) ?? totalDays - 1;

  return {
    startPct: (startIdx / totalDays) * 100,
    widthPct: Math.max(4, ((endIdx - startIdx + 1) / totalDays) * 100),
  };
}

function getPalette(isDark: boolean): CalendarStyle {
  return {
    '--calendar-bg': isDark ? 'var(--card)' : '#ffffff',
    '--calendar-border': isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)',
    '--calendar-header-bg': isDark ? 'var(--background-alt)' : '#f5f5ef',
    '--calendar-divider': isDark ? 'var(--divider)' : 'rgba(0,0,0,0.06)',
    '--calendar-text-main': 'var(--foreground)',
    '--calendar-text-muted': 'var(--foreground-muted)',
    '--calendar-track-bg': isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
    '--calendar-toggle-bg': isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
    '--calendar-hover-bg': isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    '--calendar-today': '#458482',
    background: 'var(--calendar-bg)',
    border: '1px solid var(--calendar-border)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };
}

const CalendarRow = memo(function CalendarRow({
  member,
  tasks,
  isLast,
  isRTL,
  lang,
  rowIndex,
  todayPct,
}: {
  member: Member;
  tasks: PositionedTask[];
  isLast: boolean;
  isRTL: boolean;
  lang: Lang;
  rowIndex: number;
  todayPct: number | null;
}) {
  const memberStyle: MemberStyle = {
    '--member-color': member.color,
    borderBottom: isLast ? 'none' : '1px solid var(--calendar-divider)',
    height: ROW_H,
  };

  return (
    <div className="flex items-center" style={memberStyle}>
      <div
        className={`flex h-full shrink-0 items-center gap-2 px-3 ${MEMBER_COL}`}
        style={{
          borderRight: isRTL ? 'none' : '1px solid var(--calendar-divider)',
          borderLeft: isRTL ? '1px solid var(--calendar-divider)' : 'none',
        }}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--member-color)] text-[9px] font-black text-white shadow-[0_2px_8px_color-mix(in_srgb,var(--member-color)_25%,transparent)]">
          {member.avatar}
        </div>
        <span className="truncate text-start text-[10px] font-bold text-[var(--calendar-text-main)]">
          {member.name}
        </span>
      </div>

      <div className="relative flex-1" style={{ height: ROW_H }}>
        {todayPct !== null && (
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-[color-mix(in_srgb,var(--calendar-today)_32%,transparent)]"
            style={{ [isRTL ? 'right' : 'left']: `${todayPct}%` }}
          />
        )}

        <div
          className="absolute inset-x-2 top-1/2 rounded-full bg-[var(--calendar-track-bg)]"
          style={{ height: TRACK_H, transform: 'translateY(-50%)' }}
        />

        {tasks.map((task) => {
          const barStyle: TaskStyle = {
            '--task-color': task.color,
            position: 'absolute',
            height: BAR_H,
            top: '50%',
            width: `${task.widthPct}%`,
            transform: 'translateY(-50%)',
            [isRTL ? 'right' : 'left']: `${task.startPct}%`,
          };

          return (
            <div key={task.id} style={barStyle}>
              <m.div
                initial={false}
                animate={{ scaleX: 1, opacity: 0.9 }}
                transition={{ ...TASK_TRANSITION, delay: rowIndex * 0.04 }}
                whileHover={{ opacity: 1 }}
                className="flex h-full w-full cursor-default items-center overflow-hidden rounded-full bg-[var(--task-color)] shadow-[0_2px_8px_color-mix(in_srgb,var(--task-color)_32%,transparent)]"
                style={{
                  transformOrigin: isRTL ? 'right center' : 'left center',
                  paddingLeft: isRTL ? 6 : 8,
                  paddingRight: isRTL ? 8 : 6,
                }}
              >
                <span
                  className="pointer-events-none overflow-hidden text-ellipsis whitespace-nowrap text-[8px] font-bold text-[rgba(255,255,255,0.95)] [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]"
                  style={{
                    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                    direction: isRTL ? 'rtl' : 'ltr',
                  }}
                >
                  {lang === 'ar' ? task.titleAr : task.title}
                </span>
              </m.div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

function ProjectCalendar() {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';
  const copy = TEXT[lang];
  const locale = lang === 'ar' ? 'ar-SA' : 'en-US';

  const [view, setView] = useState<View>('weekly');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));

  const palette = useMemo(() => getPalette(isDark), [isDark]);
  const dayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }), [locale]);
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }), [locale]);
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);

  const days = useMemo(() => (view === 'monthly' ? getMonthDays(anchor) : getWeekDays(anchor)), [anchor, view]);
  const dayIndexByKey = useMemo(() => new Map(days.map((day, index) => [getDayKey(day), index])), [days]);
  const tasks = useMemo(
    () => (view === 'mytasks' ? ALL_TASKS.filter((task) => task.memberId === MY_MEMBER_ID) : ALL_TASKS),
    [view],
  );

  const tasksByMember = useMemo(() => {
    const grouped = new Map<number, PositionedTask[]>();
    MEMBERS.forEach((member) => grouped.set(member.id, []));

    tasks.forEach((task) => {
      const position = getTaskPosition(task, days, dayIndexByKey);
      if (!position) return;
      grouped.get(task.memberId)?.push({ ...task, ...position });
    });

    return grouped;
  }, [dayIndexByKey, days, tasks]);

  const todayKey = useMemo(() => getDayKey(new Date()), []);
  const todayIdx = dayIndexByKey.get(todayKey) ?? -1;
  const todayPct = todayIdx >= 0 ? ((todayIdx + 0.5) / days.length) * 100 : null;

  const labelStep = view === 'monthly' ? Math.ceil(days.length / 7) : 1;
  const labelDays = useMemo(() => days.filter((_, index) => index % labelStep === 0), [days, labelStep]);
  const views = useMemo(
    () => [
      { key: 'weekly' as const, label: copy.weekly },
      { key: 'monthly' as const, label: copy.monthly },
      { key: 'mytasks' as const, label: copy.mytasks },
    ],
    [copy.monthly, copy.mytasks, copy.weekly],
  );

  const navigate = useCallback((direction: Direction) => {
    setAnchor((current) => {
      const next = startOfDay(current);
      if (view === 'monthly') next.setMonth(next.getMonth() + direction);
      else next.setDate(next.getDate() + 7 * direction);
      return next;
    });
  }, [view]);

  const navButtons = useMemo(
    () => [
      { direction: -1 as const, label: copy.previous, Icon: isRTL ? ChevronRight : ChevronLeft },
      { direction: 1 as const, label: copy.next, Icon: isRTL ? ChevronLeft : ChevronRight },
    ],
    [copy.next, copy.previous, isRTL],
  );

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        initial={{ opacity: 0, y: 22, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={CARD_TRANSITION}
        dir={isRTL ? 'rtl' : 'ltr'}
        aria-labelledby="project-calendar-title"
        className="w-full overflow-hidden rounded-2xl"
        style={palette}
      >
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-[var(--calendar-header-bg)] border-b border-[var(--calendar-divider)]">
          <div className="flex min-w-0 items-center gap-2">
            <h2
              id="project-calendar-title"
              className="text-sm font-bold uppercase tracking-widest text-[var(--calendar-text-main)]"
              style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {copy.title}
            </h2>
            <span className="text-[11px] font-semibold text-[var(--calendar-text-muted)]">
              {monthFormatter.format(anchor)}
            </span>
            <div className="flex items-center gap-0.5">
              {navButtons.map(({ direction, label, Icon }) => (
                <button
                  key={direction}
                  type="button"
                  aria-label={label}
                  onClick={() => navigate(direction)}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-[var(--calendar-text-muted)] transition-colors hover:bg-[var(--calendar-hover-bg)] hover:text-[var(--calendar-text-main)]"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-[var(--calendar-toggle-bg)] p-1">
            {views.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className="cursor-pointer rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-200"
                style={{
                  background: view === key ? '#458482' : 'transparent',
                  color: view === key ? '#ffffff' : 'var(--calendar-text-muted)',
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: view === 'monthly' ? 600 : 'auto' }}>
            <div className="flex border-b border-[var(--calendar-divider)]">
              <div
                className={`shrink-0 ${MEMBER_COL}`}
                style={{
                  borderRight: isRTL ? 'none' : '1px solid var(--calendar-divider)',
                  borderLeft: isRTL ? '1px solid var(--calendar-divider)' : 'none',
                }}
              />
              <div className="flex flex-1">
                {labelDays.map((day) => (
                  <div
                    key={getDayKey(day)}
                    className="flex-1 py-2 text-center text-[9px] font-bold tracking-[0.05em]"
                    style={{ color: getDayKey(day) === todayKey ? 'var(--calendar-today)' : 'var(--calendar-text-muted)' }}
                  >
                    {dayFormatter.format(day)}
                  </div>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <m.div
                key={view}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                {MEMBERS.map((member, index) => (
                  <CalendarRow
                    key={member.id}
                    member={member}
                    tasks={tasksByMember.get(member.id) ?? []}
                    isLast={index === MEMBERS.length - 1}
                    isRTL={isRTL}
                    lang={lang}
                    rowIndex={index}
                    todayPct={todayPct}
                  />
                ))}
              </m.div>
            </AnimatePresence>

            <div className="flex border-t border-[var(--calendar-divider)]">
              <div
                className={`shrink-0 ${MEMBER_COL}`}
                style={{
                  borderRight: isRTL ? 'none' : '1px solid var(--calendar-divider)',
                  borderLeft: isRTL ? '1px solid var(--calendar-divider)' : 'none',
                }}
              />
              <div className="flex flex-1">
                {labelDays.map((day) => (
                  <div
                    key={getDayKey(day)}
                    className="flex-1 py-1.5 text-center text-[9px] font-semibold opacity-55"
                    style={{ color: getDayKey(day) === todayKey ? 'var(--calendar-today)' : 'var(--calendar-text-muted)' }}
                  >
                    {view === 'monthly' ? day.getDate() : weekdayFormatter.format(day)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </m.section>
    </LazyMotion>
  );
}

export default memo(ProjectCalendar);
