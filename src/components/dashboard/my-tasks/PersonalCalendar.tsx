"use client";

import React, { useState, useMemo, useCallback, memo } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useLang } from "@/context/LangContext";

type View = "weekly" | "monthly";

interface Task {
  id:      number;
  title:   string;
  titleAr: string;
  start:   Date;
  end:     Date;
  color:   string;
}

interface PersonalCalendarProps {
  /** Tasks that belong ONLY to the current user — filter on the parent/server */
  tasks?:     Task[];
  /** Member accent colour (hex) — used for today line & active button */
  accentColor?: string;
}

/* ─── Date helpers ──────────────────────────────────────────────────────────── */
function getWeekDays(anchor: Date): Date[] {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
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

// Static nav-button hover handlers — depend only on the now-constant TEXT_MAIN/TEXT_MUTED
function handleNavBtnEnter(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.color      = TEXT_MAIN;
  e.currentTarget.style.background = "var(--hover-bg)";
}
function handleNavBtnLeave(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.color      = TEXT_MUTED;
  e.currentTarget.style.background = "transparent";
}

/* ─── Demo data (remove when wiring real API) ───────────────────────────────── */
const _d = (offset: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt;
};

export const DEMO_TASKS: Task[] = [
  { id: 1, title: "Character Rigging", titleAr: "تحريك الشخصية",  start: _d(-3), end: _d(2),  color: "#458482" },
  { id: 2, title: "Walk Cycle",        titleAr: "دورة المشي",      start: _d(3),  end: _d(7),  color: "#5ea8a4" },
  { id: 3, title: "Sound Design",      titleAr: "تصميم الصوت",     start: _d(8),  end: _d(13), color: "#458482" },
  { id: 4, title: "Final Review",      titleAr: "المراجعة النهائية",start: _d(14), end: _d(18), color: "#366b69" },
];

/* ─── NavArrowButton ─────────────────────────────────────────────────────────── */
const NavArrowButton = memo(function NavArrowButton({ direction, Icon, onNavigate }: {
  direction: 1 | -1;
  Icon: React.ComponentType<{ className?: string }>;
  onNavigate: (dir: 1 | -1) => void;
}) {
  return (
    <button
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
}: {
  task: Task; startPct: number; widthPct: number; index: number;
  isRTL: boolean; lang: string;
  rowStyle: React.CSSProperties;
  trackStyle: React.CSSProperties;
  todayLineStyle: React.CSSProperties | null;
  labelStyle: React.CSSProperties;
}) {
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
    overflow: "hidden", background: task.color, borderRadius: "999px",
    cursor: "default", boxShadow: `0 2px 8px ${task.color}50`,
    transformOrigin: isRTL ? "right center" : "left center",
    paddingLeft:  isRTL ? "6px" : "10px",
    paddingRight: isRTL ? "10px" : "6px",
  }), [task.color, isRTL]);

  return (
    <div className="flex items-center" style={rowStyle}>
      {/* Task bar area — full width */}
      <div className="flex-1 relative" style={BAR_AREA_STYLE}>

        {/* Today line */}
        {todayLineStyle && (
          <div className="absolute top-0 bottom-0 w-px z-10 pointer-events-none" style={todayLineStyle} />
        )}

        {/* Grey track */}
        <div className="absolute inset-x-2 rounded-full" style={trackStyle} />

        {/* Coloured bar */}
        <div style={barWrapStyle}>
          <m.div
            initial={false}
            animate={{ scaleX: 1, opacity: 0.9 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
            whileHover={{ opacity: 1 }}
            style={barStyle}
          >
            <span style={labelStyle}>
              {lang === "ar" ? task.titleAr : task.title}
            </span>
          </m.div>
        </div>
      </div>
    </div>
  );
});

/* ─── Component ─────────────────────────────────────────────────────────────── */
function PersonalCalendar({
  tasks       = DEMO_TASKS,
  accentColor = "#458482",
}: PersonalCalendarProps) {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === "dark";

  const [view,   setView]   = useState<View>("weekly");
  const [anchor, setAnchor] = useState(new Date());

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

  const navigate = useCallback((dir: 1 | -1) => {
    const next = new Date(anchor);
    if (view === "monthly") next.setMonth(anchor.getMonth() + dir);
    else                    next.setDate(anchor.getDate() + 7 * dir);
    setAnchor(next);
  }, [anchor, view]);

  /* ── Bar positions ── */
  const getBarPct = useCallback((task: Task): { startPct: number; widthPct: number } | null => {
    const total      = days.length;
    const rangeStart = days[0];
    const rangeEnd   = days[total - 1];
    if (task.end < rangeStart || task.start > rangeEnd) return null;

    const tStart = task.start < rangeStart ? rangeStart : task.start;
    const tEnd   = task.end   > rangeEnd   ? rangeEnd   : task.end;

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

  const { todayIdx, todayPct } = useMemo(() => {
    const idx = days.findIndex(d => d.toDateString() === todayStr);
    return { todayIdx: idx, todayPct: idx >= 0 ? ((idx + 0.5) / days.length) * 100 : null };
  }, [days, todayStr]);

  const labelDays = useMemo(() => {
    const step = view === "monthly" ? Math.ceil(days.length / 7) : 1;
    return days.filter((_, i) => i % step === 0);
  }, [days, view]);

  /* ── i18n ── */
  const tx = useMemo(() => ({
    title:   lang === "ar" ? "مهامي" : "My Tasks",
    weekly:  lang === "ar" ? "أسبوعي" : "Weekly",
    monthly: lang === "ar" ? "شهري"   : "Monthly",
    empty:   lang === "ar" ? "لا توجد مهام في هذه الفترة" : "No tasks in this period",
  }), [lang]);

  const views = useMemo<{ key: View; label: string }[]>(() => ([
    { key: "weekly",  label: tx.weekly  },
    { key: "monthly", label: tx.monthly },
  ]), [tx]);

  const navButtons = useMemo(() => ([
    { dir: -1 as const, Icon: isRTL ? ChevronRight : ChevronLeft },
    { dir:  1 as const, Icon: isRTL ? ChevronLeft  : ChevronRight },
  ]), [isRTL]);

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

  // Identical for every task row regardless of which task — was recomputed
  // from scratch inside the per-task .map() before.
  const taskLabelStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.95)",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    letterSpacing: "0.02em", textShadow: "0 1px 4px rgba(0,0,0,0.5)",
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
            <h2 className="text-sm font-bold uppercase tracking-widest" style={titleStyle}>
              {tx.title}
            </h2>

            <span className="text-[11px] font-semibold" style={MUTED_TEXT_STYLE}>
              {fmtMonth(anchor, lang)}
            </span>

            <div className="flex items-center gap-0.5">
              {navButtons.map(({ dir, Icon }, i) => (
                <NavArrowButton key={i} direction={dir} Icon={Icon} onNavigate={navigate} />
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
        <div className="overflow-x-auto">
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
              <AnimatePresence mode="wait">
                <m.div
                  key={view}
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  /* min-height fills the viewport even when tasks < 5 */
                  style={SCROLL_MIN_HEIGHT_STYLE}
                >
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
                      />
                    ))
                  )}
                </m.div>
              </AnimatePresence>
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