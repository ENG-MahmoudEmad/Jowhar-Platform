//src\components\dashboard\my-tasks\PersonalCalendar.tsx
"use client";

import React, { useState, useMemo, useCallback, memo } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useLang } from "@/context/LangContext";
import { useSwipeNavigate } from "@/hooks/useSwipeNavigate";
import { parseDateOnly, type Task, type TaskPriority } from "@/lib/taskStats";

type View = "weekly" | "monthly";
type Direction = 1 | -1;

interface PersonalCalendarProps {
  /** Tasks that belong ONLY to the current user — filtered on the server */
  tasks: Task[];
  /** Member accent colour (hex) — used for today line & active button */
  accentColor?: string;
  /** Quick status toggle: done ⇄ open */
  onToggleTask?: (taskId: string) => void;
}

/* ─── Bar colours ───────────────────────────────────────────────────────────
   حسب الأولوية مش حسب لون العضو: بصفحة My Tasks كل التاسكات لنفس الشخص،
   فلون العضو كان بيعطي كل البارات نفس اللون بالضبط — صحيح لكن بلا معلومة.
   نفس ألوان كارد Add Task بالأدمن، فالأولوية اللي اختارها المدير هي نفسها
   اللي بيشوفها العضو.
   ───────────────────────────────────────────────────────────────────────────── */
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "#458482",
  medium: "#e0a740",
  high: "#ef4444",
};

/* ─── Date helpers ──────────────────────────────────────────────────────────── */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getWeekDays(anchor: Date): Date[] {
  const start = startOfDay(anchor);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    return dt;
  });
}

function getMonthDays(anchor: Date): Date[] {
  const year  = anchor.getFullYear();
  const month = anchor.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1));
}

function fmt(date: Date, lang: string) {
  return date.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
    day: "numeric", month: "short",
  });
}

function fmtMonth(date: Date, lang: string) {
  return date.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
    month: "long", year: "numeric",
  });
}

/* ─── Layout constants ──────────────────────────────────────────────────────── */
const ROW_H        = 48;        // px — row height
const TRACK_H      = 6;         // px — grey track
const BAR_H        = 20;        // px — task bar
const VISIBLE_ROWS = 5;         // rows visible before scroll kicks in
const SCROLL_H     = ROW_H * VISIBLE_ROWS; // 240px fixed scroll area

/* ─── Module-level style/text constants (zero per-render allocation) ──────────── */
const TEXT_MAIN  = "var(--foreground)";
const TEXT_MUTED = "var(--foreground-muted)";
const MUTED_TEXT_STYLE: React.CSSProperties = { color: TEXT_MUTED };
const BAR_AREA_STYLE: React.CSSProperties = { height: `${ROW_H}px` };
const SCROLL_CONTAINER_STYLE: React.CSSProperties = { height: `${SCROLL_H}px` };
const SCROLL_MIN_HEIGHT_STYLE: React.CSSProperties = { minHeight: `${SCROLL_H}px` };

// نفس توقيتات ProjectCalendar بالضبط — الحركتين لازم تحسّا نفس الشي
const ROW_SLIDE_TRANSITION = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

const TOOLTIP_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

// Static nav-button hover handlers — depend only on the now-constant TEXT_MAIN/TEXT_MUTED
function handleNavBtnEnter(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.color      = TEXT_MAIN;
  e.currentTarget.style.background = "var(--hover-bg)";
}
function handleNavBtnLeave(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.color      = TEXT_MUTED;
  e.currentTarget.style.background = "transparent";
}

/* ─── NavArrowButton ─────────────────────────────────────────────────────────── */
const NavArrowButton = memo(function NavArrowButton({ direction, label, Icon, onNavigate }: {
  direction: Direction;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  onNavigate: (dir: Direction) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onNavigate(direction)}
      className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
      style={MUTED_TEXT_STYLE}
      onMouseEnter={handleNavBtnEnter}
      onMouseLeave={handleNavBtnLeave}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
});

/* ─── ViewToggleButton ───────────────────────────────────────────────────────── */
const ViewToggleButton = memo(function ViewToggleButton({ viewKey, label, isActive, accentColor, lang, onSelect }: {
  viewKey: View; label: string; isActive: boolean; accentColor: string; lang: string;
  onSelect: (key: View) => void;
}) {
  const style = useMemo<React.CSSProperties>(() => ({
    background: isActive ? accentColor : "transparent",
    color:      isActive ? "#ffffff"   : TEXT_MUTED,
    fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit",
  }), [isActive, accentColor, lang]);

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={() => onSelect(viewKey)}
      className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
      style={style}
    >
      {label}
    </button>
  );
});

/* ─── DateHeaderLabel / DateFooterLabel ──────────────────────────────────────── */
const DateHeaderLabel = memo(function DateHeaderLabel({ label, isToday, accentColor }: {
  label: string; isToday: boolean; accentColor: string;
}) {
  const style = useMemo<React.CSSProperties>(() => ({
    fontSize: "9px", fontWeight: 700, letterSpacing: "0.05em",
    color: isToday ? accentColor : TEXT_MUTED,
  }), [isToday, accentColor]);

  return <div className="flex-1 text-center py-2" style={style}>{label}</div>;
});

const DateFooterLabel = memo(function DateFooterLabel({ label, isToday, accentColor }: {
  label: string; isToday: boolean; accentColor: string;
}) {
  const style = useMemo<React.CSSProperties>(() => ({
    fontSize: "9px", fontWeight: 600, opacity: 0.55,
    color: isToday ? accentColor : TEXT_MUTED,
  }), [isToday, accentColor]);

  return <div className="flex-1 text-center py-1.5" style={style}>{label}</div>;
});

/* ─── GanttTaskRow ───────────────────────────────────────────────────────────── */
const GanttTaskRow = memo(function GanttTaskRow({
  task, startPct, widthPct, index, isRTL, lang,
  rowStyle, trackStyle, todayLineStyle, labelStyle,
  animKey, navDirection, tooltipStyle, onToggle,
}: {
  task: Task; startPct: number; widthPct: number; index: number;
  isRTL: boolean; lang: string;
  rowStyle: React.CSSProperties;
  trackStyle: React.CSSProperties;
  todayLineStyle: React.CSSProperties | null;
  labelStyle: React.CSSProperties;
  animKey: string;
  navDirection: Direction;
  tooltipStyle: React.CSSProperties;
  onToggle?: (taskId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isDone = task.status === "done";
  const color = PRIORITY_COLORS[task.priority];

  const barWrapStyle = useMemo<React.CSSProperties>(() => {
    const s: React.CSSProperties = {
      position: "absolute", height: `${BAR_H}px`, top: "50%",
      width: `${widthPct}%`, transform: "translateY(-50%)",
    };
    if (isRTL) s.right = `${startPct}%`;
    else       s.left  = `${startPct}%`;
    return s;
  }, [startPct, widthPct, isRTL]);

  const barStyle = useMemo<React.CSSProperties>(() => ({
    width: "100%", height: "100%", display: "flex", alignItems: "center",
    gap: "4px",
    overflow: "hidden",
    // المنجزة بتبهت وتنمسك بإطار بدل تعبئة كاملة — بتضل مقروءة بس ما بتشد النظر
    background: isDone ? "transparent" : color,
    border: isDone ? `1px dashed ${color}` : "none",
    borderRadius: "999px",
    cursor: onToggle ? "pointer" : "default",
    boxShadow: isDone ? "none" : `0 2px 8px ${color}50`,
    transformOrigin: isRTL ? "right center" : "left center",
    paddingLeft:  isRTL ? "6px" : "10px",
    paddingRight: isRTL ? "10px" : "6px",
  }), [color, isRTL, isDone, onToggle]);

  const textStyle = useMemo<React.CSSProperties>(() => ({
    ...labelStyle,
    color: isDone ? color : "rgba(255,255,255,0.95)",
    textDecoration: isDone ? "line-through" : "none",
    textShadow: isDone ? "none" : "0 1px 4px rgba(0,0,0,0.5)",
  }), [labelStyle, isDone, color]);

  const handleClick = useCallback(() => onToggle?.(task.id), [onToggle, task.id]);
  const handleHoverStart = useCallback(() => setHovered(true), []);
  const handleHoverEnd = useCallback(() => setHovered(false), []);

  return (
    <div className="flex items-center" style={rowStyle}>
      {/* Task bar area — full width */}
      <div className="flex-1 relative overflow-hidden" style={BAR_AREA_STYLE}>

        {/* Today line */}
        {todayLineStyle && (
          <div className="absolute top-0 bottom-0 w-px z-10 pointer-events-none" style={todayLineStyle} />
        )}

        {/* Grey track */}
        <div className="absolute inset-x-2 rounded-full" style={trackStyle} />

        {/*
          طبقة البار بتنزلق باتجاه التنقّل (سهم أو سحب) — نفس سلوك
          ProjectCalendar. الخلفية والخط الرمادي بيضلوا ثابتين.
        */}
        <AnimatePresence initial={false}>
          <m.div
            key={animKey}
            initial={{ opacity: 0, x: navDirection * 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: navDirection * -18 }}
            transition={ROW_SLIDE_TRANSITION}
            className="absolute inset-0"
          >
            <div style={barWrapStyle}>
              <m.div
                initial={false}
                animate={{ scaleX: 1, opacity: isDone ? 0.75 : 0.9 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
                whileHover={{ opacity: 1 }}
                onHoverStart={handleHoverStart}
                onHoverEnd={handleHoverEnd}
                style={barStyle}
                onClick={handleClick}
                role={onToggle ? "button" : undefined}
                aria-pressed={onToggle ? isDone : undefined}
              >
                {isDone && <Check size={11} style={{ color, flexShrink: 0 }} aria-hidden="true" />}
                <span style={textStyle}>{task.title}</span>
              </m.div>

              {/* Tooltip — العنوان كامل، لأن البار القصير بيقص النص */}
              <AnimatePresence>
                {hovered && (
                  <m.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 3, scale: 0.97 }}
                    transition={TOOLTIP_TRANSITION}
                    className="pointer-events-none absolute z-30 whitespace-nowrap rounded-md px-1.5 py-[2px] text-[9px] font-bold leading-[1.2] shadow-[0_2px_10px_rgba(0,0,0,0.28)]"
                    style={{
                      ...tooltipStyle,
                      bottom: "calc(100% + 2px)",
                      [isRTL ? "right" : "left"]: 0,
                    }}
                  >
                    {task.title}
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
});

/* ─── Component ─────────────────────────────────────────────────────────────── */
function PersonalCalendar({
  tasks,
  accentColor = "#458482",
  onToggleTask,
}: PersonalCalendarProps) {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === "dark";

  const [view,   setView]   = useState<View>("weekly");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [navDirection, setNavDirection] = useState<Direction>(1);

  /* ── Palette (mirrors ProjectCalendar exactly) ── */
  const bg        = isDark ? "var(--card)"           : "#ffffff";
  const border    = isDark ? "var(--card-border)"    : "rgba(0,0,0,0.07)";
  const headerBg  = isDark ? "var(--background-alt)" : "#f5f5ef";
  const divider   = isDark ? "var(--divider)"        : "rgba(0,0,0,0.06)";
  const trackBg   = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";

  /* ── Days in view ── */
  const days = useMemo(
    () => (view === "monthly" ? getMonthDays(anchor) : getWeekDays(anchor)),
    [view, anchor],
  );

  const navigate = useCallback((dir: Direction) => {
    setNavDirection(dir);
    setAnchor((current) => {
      const next = startOfDay(current);
      if (view === "monthly") next.setMonth(next.getMonth() + dir);
      else                    next.setDate(next.getDate() + 7 * dir);
      return next;
    });
  }, [view]);

  /** ضغط العنوان بيرجّعك للفترة اللي فيها اليوم — نفس سلوك ProjectCalendar. */
  const goToToday = useCallback(() => {
    setNavDirection(1);
    setAnchor(startOfDay(new Date()));
  }, []);

  /*
    السحب بالماوس/التاتش باد — نفس الهوك المستعمل بالداشبورد.
    respectNativeScroll: العرض الشهري أوسع من الكارد، فالسكرول الأفقي جواه
    لازم يضل شغال، والسحب بياخد الدور عند الحواف.
  */
  const { ref: scrollAreaRef, swipeHandlers, swipeStyle } = useSwipeNavigate({
    onNavigate: navigate,
    respectNativeScroll: true,
  });

  /* ── Bar positions ── */
  const getBarPct = useCallback((task: Task): { startPct: number; widthPct: number } | null => {
    const total      = days.length;
    const rangeStart = days[0];
    const rangeEnd   = days[total - 1];

    // التواريخ بتوصل كـ yyyy-mm-dd — التحويل هون مرة وحدة بدل تخزين Date بالحالة
    const taskStart = parseDateOnly(task.startDate);
    const taskEnd   = parseDateOnly(task.deadline);

    if (taskEnd < rangeStart || taskStart > rangeEnd) return null;

    const tStart = taskStart < rangeStart ? rangeStart : taskStart;
    const tEnd   = taskEnd   > rangeEnd   ? rangeEnd   : taskEnd;

    const si = days.findIndex(d => d.toDateString() === tStart.toDateString());
    const ei = days.findIndex(d => d.toDateString() === tEnd.toDateString());
    const s  = si < 0 ? 0        : si;
    const e  = ei < 0 ? total - 1 : ei;

    return {
      startPct: (s / total) * 100,
      widthPct: Math.max(4, ((e - s + 1) / total) * 100),
    };
  }, [days]);

  // Single combined pass: was calling getBarPct twice per task before (once to
  // filter, once again at render time) — now computed once and reused.
  const visibleTasksWithPos = useMemo(() => {
    return tasks.reduce<{ task: Task; startPct: number; widthPct: number }[]>((acc, task) => {
      const pos = getBarPct(task);
      if (pos) acc.push({ task, startPct: pos.startPct, widthPct: pos.widthPct });
      return acc;
    }, []);
  }, [tasks, getBarPct]);

  // Computed once per render and reused for every day-label comparison below,
  // instead of calling `new Date()` fresh inside every map iteration.
  const todayStr = new Date().toDateString();

  const { todayPct } = useMemo(() => {
    const idx = days.findIndex(d => d.toDateString() === todayStr);
    return { todayPct: idx >= 0 ? ((idx + 0.5) / days.length) * 100 : null };
  }, [days, todayStr]);

  const labelDays = useMemo(() => {
    const step = view === "monthly" ? Math.ceil(days.length / 7) : 1;
    return days.filter((_, i) => i % step === 0);
  }, [days, view]);

  /** يتغيّر مع كل تنقّل، فيشغّل انزلاق البارات. */
  const animKey = `${view}-${anchor.getTime()}`;

  /* ── i18n ── */
  const tx = useMemo(() => ({
    title:      lang === "ar" ? "مهامي" : "My Tasks",
    weekly:     lang === "ar" ? "أسبوعي" : "Weekly",
    monthly:    lang === "ar" ? "شهري"   : "Monthly",
    empty:      lang === "ar" ? "لا توجد مهام في هذه الفترة" : "No tasks in this period",
    previous:   lang === "ar" ? "الفترة السابقة" : "Previous period",
    next:       lang === "ar" ? "الفترة التالية" : "Next period",
    resetToday: lang === "ar" ? "الانتقال لليوم" : "Jump to today",
  }), [lang]);

  const views = useMemo<{ key: View; label: string }[]>(() => ([
    { key: "weekly",  label: tx.weekly  },
    { key: "monthly", label: tx.monthly },
  ]), [tx]);

  const navButtons = useMemo(() => ([
    { dir: -1 as const, label: tx.previous, Icon: isRTL ? ChevronRight : ChevronLeft },
    { dir:  1 as const, label: tx.next,     Icon: isRTL ? ChevronLeft  : ChevronRight },
  ]), [isRTL, tx]);

  /* ── Memoized composite styles ── */
  const outerStyle = useMemo<React.CSSProperties>(() => ({
    background: bg, border: `1px solid ${border}`,
    userSelect: "none", WebkitUserSelect: "none",
  }), [bg, border]);

  const headerStyle = useMemo<React.CSSProperties>(() => ({
    background: headerBg, borderBottom: `1px solid ${divider}`, flexDirection: "row",
  }), [headerBg, divider]);

  const titleStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MAIN, fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit",
  }), [lang]);

  const emptyStateStyle = useMemo<React.CSSProperties>(() => ({
    height: `${SCROLL_H}px`, color: TEXT_MUTED,
    fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit",
  }), [lang]);

  const trackStyle = useMemo<React.CSSProperties>(() => ({
    height: `${TRACK_H}px`, top: "50%", transform: "translateY(-50%)", background: trackBg,
  }), [trackBg]);

  const todayLineStyle = useMemo<React.CSSProperties | null>(() => {
    if (todayPct === null) return null;
    return {
      [isRTL ? "right" : "left"]: `${todayPct}%`,
      background: `${accentColor}50`,
    };
  }, [todayPct, isRTL, accentColor]);

  const tooltipStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark ? "rgba(22,27,34,0.96)" : "rgba(255,255,255,0.98)",
    color: TEXT_MAIN,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
    fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit",
    direction: isRTL ? "rtl" : "ltr",
  }), [isDark, lang, isRTL]);

  // Identical for every task row regardless of which task — was recomputed
  // from scratch inside the per-task .map() before.
  const taskLabelStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: "9px", fontWeight: 700,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    letterSpacing: "0.02em",
    fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit",
    direction: isRTL ? "rtl" : "ltr",
    pointerEvents: "none",
  }), [lang, isRTL]);

  const taskRowStyle = useMemo<React.CSSProperties>(() => ({
    height: `${ROW_H}px`, borderBottom: `1px solid ${divider}`,
  }), [divider]);

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 22, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.18, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        dir={isRTL ? "rtl" : "ltr"}
        className="w-full rounded-2xl overflow-hidden"
        style={outerStyle}
      >
        {/* ── Header ── */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-3" style={headerStyle}>
          {/* Title + nav */}
          <div className="flex items-center gap-2" style={{ flexDirection: "row" }}>
            <button
              type="button"
              onClick={goToToday}
              aria-label={tx.resetToday}
              title={tx.resetToday}
              className="cursor-pointer text-sm font-bold uppercase tracking-widest transition-colors hover:text-[#458482]"
              style={titleStyle}
            >
              {tx.title}
            </button>

            <span className="text-[11px] font-semibold" style={MUTED_TEXT_STYLE}>
              {fmtMonth(anchor, lang)}
            </span>

            <div className="flex items-center gap-0.5">
              {navButtons.map(({ dir, label, Icon }) => (
                <NavArrowButton key={dir} direction={dir} label={label} Icon={Icon} onNavigate={navigate} />
              ))}
            </div>
          </div>

          {/* View toggle */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)" }}
          >
            {views.map(v => (
              <ViewToggleButton
                key={v.key}
                viewKey={v.key}
                label={v.label}
                isActive={view === v.key}
                accentColor={accentColor}
                lang={lang}
                onSelect={setView}
              />
            ))}
          </div>
        </div>

        {/* ── Gantt body ── */}
        <div
          ref={scrollAreaRef}
          className="overflow-x-auto"
          style={swipeStyle}
          {...swipeHandlers}
        >
          <div style={{ minWidth: view === "monthly" ? "600px" : "auto" }}>

            {/* Date label row */}
            <div className="flex" style={{ borderBottom: `1px solid ${divider}` }}>
              <div className="flex-1 flex">
                {labelDays.map((day, i) => (
                  <DateHeaderLabel
                    key={i}
                    label={fmt(day, lang)}
                    isToday={day.toDateString() === todayStr}
                    accentColor={accentColor}
                  />
                ))}
              </div>
            </div>

            {/* ── Scrollable task rows — fixed height = 5 rows ── */}
            <div className="overflow-y-auto custom-scrollbar" style={SCROLL_CONTAINER_STYLE}>
              <div style={SCROLL_MIN_HEIGHT_STYLE}>
                {visibleTasksWithPos.length === 0 ? (
                  /* Empty state — still occupies full fixed height */
                  <div
                    className="flex items-center justify-center text-[11px] font-medium"
                    style={emptyStateStyle}
                  >
                    {tx.empty}
                  </div>
                ) : (
                  visibleTasksWithPos.map(({ task, startPct, widthPct }, tIdx) => (
                    <GanttTaskRow
                      key={task.id}
                      task={task}
                      startPct={startPct}
                      widthPct={widthPct}
                      index={tIdx}
                      isRTL={isRTL}
                      lang={lang}
                      rowStyle={taskRowStyle}
                      trackStyle={trackStyle}
                      todayLineStyle={todayLineStyle}
                      labelStyle={taskLabelStyle}
                      animKey={animKey}
                      navDirection={navDirection}
                      tooltipStyle={tooltipStyle}
                      onToggle={onToggleTask}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Footer weekday labels */}
            <div className="flex" style={{ borderTop: `1px solid ${divider}` }}>
              <div className="flex-1 flex">
                {labelDays.map((day, i) => (
                  <DateFooterLabel
                    key={i}
                    label={
                      view === "monthly"
                        ? String(day.getDate())
                        : day.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { weekday: "short" })
                    }
                    isToday={day.toDateString() === todayStr}
                    accentColor={accentColor}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </m.div>
    </LazyMotion>
  );
}

export default memo(PersonalCalendar);