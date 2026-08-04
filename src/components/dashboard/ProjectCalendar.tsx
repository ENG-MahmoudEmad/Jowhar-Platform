// src/components/dashboard/ProjectCalendar.tsx

"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { useSwipeNavigate } from '@/hooks/useSwipeNavigate';
import Avatar from '@/components/ui/Avatar';
import { getMemberTaskShade } from '@/lib/colorShades';
import { fetchCalendarTasksRange } from '@/app/(dashboard)/dashboard/actions';

type View = 'weekly' | 'monthly';
type Lang = 'en' | 'ar';
type Direction = 1 | -1;

// ─────────────────────────────────────────────────────────────────────────────
// Data shape — matches what the server (page.tsx) hands down. `members` is
// already the final 5 (current user + 4 alphabetical), already in order —
// this component does not re-sort. Tasks have no `color`; the 7-shade color
// is computed client-side from the member's color + the task's chronological
// rank among that member's tasks (see colorShades.ts).
// ─────────────────────────────────────────────────────────────────────────────
export interface CalendarMemberData {
  id: string;
  name: string;
  color: string;
  avatarUrl: string | null;
  initials: string;
}

export interface CalendarTaskData {
  id: string;
  memberId: string;
  title: string;
  start: string; // 'YYYY-MM-DD'
  end: string;   // 'YYYY-MM-DD'
}

interface ProjectCalendarProps {
  members: CalendarMemberData[];
  initialTasks: CalendarTaskData[];
  /** ISO 'YYYY-MM-DD' bounds of the range already fetched server-side. */
  initialRangeStart: string;
  initialRangeEnd: string;
}

type Task = {
  id: string;
  memberId: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
};

type PositionedTask = Task & {
  startPct: number;
  widthPct: number;
};

// A group of tasks for the same member whose date ranges overlap.
// Only the first task is drawn; the rest are revealed via the "+N" badge.
type TaskCluster = {
  id: string;
  tasks: PositionedTask[];
  startPct: number;
  widthPct: number;
};

type OverlapPopover = {
  memberId: string;
  tasks: PositionedTask[];
  x: number;
  y: number;
};

type CalendarStyle = React.CSSProperties & Partial<Record<`--calendar-${string}`, string>>;
type TaskStyle = React.CSSProperties & Partial<Record<'--task-color', string>>;

const ROW_H = 56;
const TRACK_H = 6;
const BAR_H = 18;
const MEMBER_COL = 'w-28 sm:w-36';
// الكارت لازم يبقى بنفس الطول دايمًا (5 صفوف) حتى لو عدد الأعضاء الفعليين
// أقل — عشان التناسق مع كارت الديدلاين جنبه (items-stretch بالصفحة).
const DISPLAY_ROWS = 5;

const CARD_TRANSITION = {
  delay: 0.12,
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const TASK_TRANSITION = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const ROW_SLIDE_TRANSITION = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

const TOOLTIP_TRANSITION = {
  duration: 0.18,
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
    resetToday: 'Jump to today',
    overlapTitle: 'Overlapping tasks',
  },
  ar: {
    title: 'التقويم',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    mytasks: 'مهامي',
    previous: 'الفترة السابقة',
    next: 'الفترة التالية',
    resetToday: 'الانتقال لليوم',
    overlapTitle: 'مهام متصادفة',
  },
} satisfies Record<Lang, Record<'title' | 'weekly' | 'monthly' | 'mytasks' | 'previous' | 'next' | 'resetToday' | 'overlapTitle', string>>;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, offset: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function addMonths(date: Date, offset: number): Date {
  const next = startOfDay(date);
  next.setMonth(next.getMonth() + offset);
  return next;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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

/**
 * Groups a member's tasks into clusters of overlapping date ranges.
 * Tasks are considered overlapping when they share at least one day.
 * Each cluster is positioned on the first (earliest-starting) task.
 */
function clusterOverlappingTasks(tasks: PositionedTask[]): TaskCluster[] {
  const sorted = [...tasks].sort((a, b) => getDayKey(a.start) - getDayKey(b.start));
  const clusters: TaskCluster[] = [];

  sorted.forEach((task) => {
    const active = clusters[clusters.length - 1];
    const activeEnd = active
      ? Math.max(...active.tasks.map((t) => getDayKey(t.end)))
      : -Infinity;

    if (active && getDayKey(task.start) <= activeEnd) {
      active.tasks.push(task);
      return;
    }

    clusters.push({
      id: `cluster-${task.id}`,
      tasks: [task],
      startPct: task.startPct,
      widthPct: task.widthPct,
    });
  });

  return clusters;
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
    '--calendar-tooltip-bg': isDark ? 'rgba(22,27,34,0.96)' : 'rgba(255,255,255,0.98)',
    '--calendar-tooltip-text': 'var(--foreground)',
    '--calendar-tooltip-border': isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    background: 'var(--calendar-bg)',
    border: '1px solid var(--calendar-border)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };
}

const CalendarRow = memo(function CalendarRow({
  member,
  clusters,
  isLast,
  isRTL,
  lang,
  rowIndex,
  todayPct,
  animKey,
  navDirection,
  onOverlapClick,
}: {
  member: CalendarMemberData;
  clusters: TaskCluster[];
  isLast: boolean;
  isRTL: boolean;
  lang: Lang;
  rowIndex: number;
  todayPct: number | null;
  animKey: string;
  navDirection: Direction;
  onOverlapClick: (memberId: string, tasks: PositionedTask[], anchorEl: HTMLElement) => void;
}) {
  const rowOuterStyle: React.CSSProperties = {
    borderBottom: isLast ? 'none' : '1px solid var(--calendar-divider)',
    height: ROW_H,
  };

  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  return (
    <div className="flex items-center" style={rowOuterStyle}>
      <div
        className={`flex h-full shrink-0 items-center gap-2 px-3 ${MEMBER_COL}`}
        style={{
          borderRight: isRTL ? 'none' : '1px solid var(--calendar-divider)',
          borderLeft: isRTL ? '1px solid var(--calendar-divider)' : 'none',
        }}
      >
        <Avatar
          avatarUrl={member.avatarUrl}
          initials={member.initials}
          name={member.name}
          size={28}
          color={member.color}
          className="text-[9px] font-black text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
        />
        <span className="truncate text-start text-[10px] font-bold text-[var(--calendar-text-main)]">
          {member.name}
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden" style={{ height: ROW_H }}>
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

        <AnimatePresence initial={false}>
          <m.div
            key={animKey}
            initial={{ opacity: 0, x: navDirection * 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: navDirection * -18 }}
            transition={ROW_SLIDE_TRANSITION}
            className="absolute inset-0"
          >
            {clusters.map((cluster) => {
              const task = cluster.tasks[0];
              const overlapCount = cluster.tasks.length - 1;

              const barStyle: TaskStyle = {
                '--task-color': task.color,
                position: 'absolute',
                height: BAR_H,
                top: '50%',
                width: `${cluster.widthPct}%`,
                transform: 'translateY(-50%)',
                [isRTL ? 'right' : 'left']: `${cluster.startPct}%`,
              };

              return (
                <div key={cluster.id} style={barStyle}>
                  <m.div
                    initial={false}
                    animate={{ scaleX: 1, opacity: 0.9 }}
                    transition={{ ...TASK_TRANSITION, delay: rowIndex * 0.04 }}
                    whileHover={{ opacity: 1 }}
                    onHoverStart={() => setHoveredTaskId(task.id)}
                    onHoverEnd={() => setHoveredTaskId((current) => (current === task.id ? null : current))}
                    className="relative flex h-full w-full cursor-default items-center overflow-hidden rounded-full bg-[var(--task-color)] shadow-[0_2px_8px_color-mix(in_srgb,var(--task-color)_32%,transparent)]"
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
                      {task.title}
                    </span>

                    {overlapCount > 0 && (
                      <button
                        type="button"
                        aria-label={`${overlapCount} more overlapping tasks`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOverlapClick(member.id, cluster.tasks, e.currentTarget);
                        }}
                        className="ms-auto shrink-0 cursor-pointer rounded-full bg-[rgba(0,0,0,0.28)] px-1.5 text-[8px] font-black leading-[14px] text-white transition-colors hover:bg-[rgba(0,0,0,0.42)]"
                      >
                        +{overlapCount}
                      </button>
                    )}
                  </m.div>

                  <AnimatePresence>
                    {hoveredTaskId === task.id && (
                      <m.div
                        initial={{ opacity: 0, y: 4, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 3, scale: 0.97 }}
                        transition={TOOLTIP_TRANSITION}
                        className="pointer-events-none absolute z-30 whitespace-nowrap rounded-md px-1.5 py-[2px] text-[9px] font-bold leading-[1.2] shadow-[0_2px_10px_rgba(0,0,0,0.28)]"
                        style={{
                          bottom: 'calc(100% + 2px)',
                          [isRTL ? 'right' : 'left']: 0,
                          background: 'var(--calendar-tooltip-bg)',
                          color: 'var(--calendar-tooltip-text)',
                          border: '1px solid var(--calendar-tooltip-border)',
                          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                          direction: isRTL ? 'rtl' : 'ltr',
                        }}
                      >
                        {task.title}
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
});

// صف فاضي (placeholder) يستخدم لما عدد الأعضاء الفعليين أقل من DISPLAY_ROWS —
// يحافظ على طول الكارت ثابت بدل ما يقصر مع كل عضو ناقص.
const EmptyCalendarRow = memo(function EmptyCalendarRow({ isLast, isRTL }: { isLast: boolean; isRTL: boolean }) {
  const rowOuterStyle: React.CSSProperties = {
    borderBottom: isLast ? 'none' : '1px solid var(--calendar-divider)',
    height: ROW_H,
  };

  return (
    <div className="flex items-center opacity-40" style={rowOuterStyle}>
      <div
        className={`flex h-full shrink-0 items-center gap-2 px-3 ${MEMBER_COL}`}
        style={{
          borderRight: isRTL ? 'none' : '1px solid var(--calendar-divider)',
          borderLeft: isRTL ? '1px solid var(--calendar-divider)' : 'none',
        }}
      >
        <div className="h-7 w-7 shrink-0 rounded-full border border-dashed border-[var(--calendar-divider)]" />
      </div>
      <div className="relative flex-1" style={{ height: ROW_H }}>
        <div
          className="absolute inset-x-2 top-1/2 rounded-full bg-[var(--calendar-track-bg)]"
          style={{ height: TRACK_H, transform: 'translateY(-50%)' }}
        />
      </div>
    </div>
  );
});


function ProjectCalendar({ members, initialTasks, initialRangeStart, initialRangeEnd }: ProjectCalendarProps) {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();
  const router = useRouter();
  const isDark = theme === 'dark';
  const copy = TEXT[lang];
  const locale = lang === 'ar' ? 'ar-SA' : 'en-US';

  const [view, setView] = useState<View>('weekly');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [navDirection, setNavDirection] = useState<Direction>(1);
  const [overlapPopover, setOverlapPopover] = useState<OverlapPopover | null>(null);

  // ── Task cache + the range currently covered by it ──────────────────────
  const [tasksCache, setTasksCache] = useState<CalendarTaskData[]>(initialTasks);
  const [loadedRange, setLoadedRange] = useState(() => ({
    start: startOfDay(new Date(initialRangeStart)),
    end: startOfDay(new Date(initialRangeEnd)),
  }));
  const isExpandingRef = useRef(false);

  const palette = useMemo(() => getPalette(isDark), [isDark]);
  const dayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }), [locale]);
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }), [locale]);
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);

  const days = useMemo(() => (view === 'monthly' ? getMonthDays(anchor) : getWeekDays(anchor)), [anchor, view]);
  const dayIndexByKey = useMemo(() => new Map(days.map((day, index) => [getDayKey(day), index])), [days]);

  // ── Expand the loaded range on demand ────────────────────────────────────
  // Only fires when the visible period goes outside what's already cached —
  // normal navigation near "today" never triggers a network request.
  useEffect(() => {
    const minVisible = getDayKey(days[0]);
    const maxVisible = getDayKey(days[days.length - 1]);
    const loadedStartKey = loadedRange.start.getTime();
    const loadedEndKey = loadedRange.end.getTime();

    if (minVisible >= loadedStartKey && maxVisible <= loadedEndKey) return;
    if (isExpandingRef.current) return;

    isExpandingRef.current = true;
    const newStart = addMonths(anchor, -2);
    const newEnd = addMonths(anchor, 2);
    const memberIds = members.map((m) => m.id);

    fetchCalendarTasksRange(memberIds, toISODate(newStart), toISODate(newEnd))
      .then((rows) => {
        setTasksCache((prev) => {
          const byId = new Map(prev.map((t) => [t.id, t]));
          rows.forEach((r) => {
            byId.set(r.id, { id: r.id, memberId: r.member_id, title: r.title, start: r.start_date, end: r.end_date });
          });
          return Array.from(byId.values());
        });
        setLoadedRange((prev) => ({
          start: newStart < prev.start ? newStart : prev.start,
          end: newEnd > prev.end ? newEnd : prev.end,
        }));
      })
      .finally(() => {
        isExpandingRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, anchor]);

  // ── Stable per-task shade, based on chronological rank among the member's
  //    ENTIRE cached task list (not just the visible window) — so a task's
  //    color never shifts as you navigate between periods. ──────────────────
  const shadeByTaskId = useMemo(() => {
    const map = new Map<string, string>();
    const byMember = new Map<string, CalendarTaskData[]>();
    tasksCache.forEach((t) => {
      const list = byMember.get(t.memberId) ?? [];
      list.push(t);
      byMember.set(t.memberId, list);
    });
    const colorByMemberId = new Map(members.map((m) => [m.id, m.color]));
    byMember.forEach((list, memberId) => {
      const baseColor = colorByMemberId.get(memberId) ?? '#458482';
      const sorted = [...list].sort((a, b) => a.start.localeCompare(b.start));
      sorted.forEach((t, idx) => map.set(t.id, getMemberTaskShade(baseColor, idx)));
    });
    return map;
  }, [tasksCache, members]);

  const clustersByMember = useMemo(() => {
    const grouped = new Map<string, PositionedTask[]>();
    members.forEach((member) => grouped.set(member.id, []));

    tasksCache.forEach((raw) => {
      if (!grouped.has(raw.memberId)) return;
      const task: Task = {
        id: raw.id,
        memberId: raw.memberId,
        title: raw.title,
        start: new Date(raw.start),
        end: new Date(raw.end),
        color: shadeByTaskId.get(raw.id) ?? '#458482',
      };
      const position = getTaskPosition(task, days, dayIndexByKey);
      if (!position) return;
      grouped.get(raw.memberId)?.push({ ...task, ...position });
    });

    const clustered = new Map<string, TaskCluster[]>();
    grouped.forEach((memberTasks, memberId) => {
      clustered.set(memberId, clusterOverlappingTasks(memberTasks));
    });

    return clustered;
  }, [dayIndexByKey, days, members, tasksCache, shadeByTaskId]);

  const todayKey = useMemo(() => getDayKey(new Date()), []);
  const todayIdx = dayIndexByKey.get(todayKey) ?? -1;
  const todayPct = todayIdx >= 0 ? ((todayIdx + 0.5) / days.length) * 100 : null;

  const labelStep = view === 'monthly' ? Math.ceil(days.length / 7) : 1;
  const labelDays = useMemo(() => days.filter((_, index) => index % labelStep === 0), [days, labelStep]);
  const views = useMemo(
    () => [
      { key: 'weekly' as const, label: copy.weekly },
      { key: 'monthly' as const, label: copy.monthly },
    ],
    [copy.monthly, copy.weekly],
  );

  const navigate = useCallback((direction: Direction) => {
    setNavDirection(direction);
    setOverlapPopover(null);
    setAnchor((current) => {
      const next = startOfDay(current);
      if (view === 'monthly') next.setMonth(next.getMonth() + direction);
      else next.setDate(next.getDate() + 7 * direction);
      return next;
    });
  }, [view]);

  const goToToday = useCallback(() => {
    setNavDirection(1);
    setOverlapPopover(null);
    setAnchor(startOfDay(new Date()));
  }, []);

  const handleOverlapClick = useCallback(
    (memberId: string, clusterTasks: PositionedTask[], anchorEl: HTMLElement) => {
      const rect = anchorEl.getBoundingClientRect();
      setOverlapPopover((current) => {
        if (current && current.memberId === memberId && current.tasks[0]?.id === clusterTasks[0]?.id) {
          return null;
        }
        return {
          memberId,
          tasks: clusterTasks,
          x: rect.left + rect.width / 2,
          y: rect.bottom + 6,
        };
      });
    },
    [],
  );

  const closeOverlapPopover = useCallback(() => setOverlapPopover(null), []);

  const goToMyTasks = useCallback(() => {
    router.push('/my-tasks');
  }, [router]);

  const navButtons = useMemo(
    () => [
      { direction: -1 as const, label: copy.previous, Icon: isRTL ? ChevronRight : ChevronLeft },
      { direction: 1 as const, label: copy.next, Icon: isRTL ? ChevronLeft : ChevronRight },
    ],
    [copy.next, copy.previous, isRTL],
  );

  // Swipe / drag / trackpad navigation (shared hook).
  const { ref: scrollAreaRef, swipeHandlers, swipeStyle } = useSwipeNavigate({
    onNavigate: navigate,
    respectNativeScroll: true,
  });

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
            <button
              type="button"
              id="project-calendar-title"
              onClick={goToToday}
              aria-label={copy.resetToday}
              title={copy.resetToday}
              className="cursor-pointer text-sm font-bold uppercase tracking-widest text-[var(--calendar-text-main)] transition-colors hover:text-[#458482]"
              style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {copy.title}
            </button>
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

          <div className="ms-auto flex items-center gap-1 rounded-xl bg-[var(--calendar-toggle-bg)] p-1">
            <button
              type="button"
              onClick={goToMyTasks}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 text-[var(--calendar-text-muted)] hover:text-[var(--calendar-text-main)]"
              style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {copy.mytasks}
            </button>
          </div>
        </div>

        <div
          ref={scrollAreaRef}
          className="overflow-x-auto"
          style={swipeStyle}
          {...swipeHandlers}
        >
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

            <div>
              {members.map((member, index) => (
                <CalendarRow
                  key={member.id}
                  member={member}
                  clusters={clustersByMember.get(member.id) ?? []}
                  isLast={index === DISPLAY_ROWS - 1}
                  isRTL={isRTL}
                  lang={lang}
                  rowIndex={index}
                  todayPct={todayPct}
                  animKey={`${view}-${anchor.getTime()}`}
                  navDirection={navDirection}
                  onOverlapClick={handleOverlapClick}
                />
              ))}
              {Array.from({ length: Math.max(0, DISPLAY_ROWS - members.length) }).map((_, i) => (
                <EmptyCalendarRow
                  key={`empty-${i}`}
                  isLast={members.length + i === DISPLAY_ROWS - 1}
                  isRTL={isRTL}
                />
              ))}
            </div>

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

      <AnimatePresence>
        {overlapPopover && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeOverlapPopover} />

            <m.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={TOOLTIP_TRANSITION}
              dir={isRTL ? 'rtl' : 'ltr'}
              role="dialog"
              aria-label={copy.overlapTitle}
              className="fixed z-50 w-56 overflow-hidden rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.32)]"
              style={{
                top: overlapPopover.y,
                left: overlapPopover.x,
                transform: 'translateX(-50%)',
                background: 'var(--calendar-tooltip-bg)',
                border: '1px solid var(--calendar-tooltip-border)',
              }}
            >
              <div
                className="px-3 py-2 text-[9px] font-black uppercase tracking-wider text-[var(--calendar-text-muted)]"
                style={{
                  borderBottom: '1px solid var(--calendar-tooltip-border)',
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                  textTransform: lang === 'ar' ? 'none' : 'uppercase',
                }}
              >
                {copy.overlapTitle}
              </div>

              <div className="max-h-48 overflow-y-auto overscroll-contain">
                {overlapPopover.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-[var(--calendar-hover-bg)]"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: task.color }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1 text-start">
                      <p
                        className="truncate text-[10px] font-bold text-[var(--calendar-text-main)]"
                        style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                      >
                        {task.title}
                      </p>
                      <p className="text-[9px] font-medium text-[var(--calendar-text-muted)]">
                        {dayFormatter.format(task.start)} — {dayFormatter.format(task.end)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}

export default memo(ProjectCalendar);