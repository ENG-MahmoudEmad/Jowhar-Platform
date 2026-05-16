"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

/* ─── Component ─────────────────────────────────────────────────────────────── */
export default function PersonalCalendar({
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
  const textMain  = "var(--foreground)";
  const textMuted = "var(--foreground-muted)";
  const trackBg   = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";

  /* ── Days in view ── */
  const days = useMemo(
    () => (view === "monthly" ? getMonthDays(anchor) : getWeekDays(anchor)),
    [view, anchor],
  );

  const navigate = (dir: 1 | -1) => {
    const next = new Date(anchor);
    if (view === "monthly") next.setMonth(anchor.getMonth() + dir);
    else                    next.setDate(anchor.getDate() + 7 * dir);
    setAnchor(next);
  };

  /* ── Bar positions ── */
  const getBarPct = (task: Task): { startPct: number; widthPct: number } | null => {
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
  };

  const todayIdx = days.findIndex(d => d.toDateString() === new Date().toDateString());
  const todayPct = todayIdx >= 0 ? ((todayIdx + 0.5) / days.length) * 100 : null;

  const labelStep = view === "monthly" ? Math.ceil(days.length / 7) : 1;
  const labelDays = days.filter((_, i) => i % labelStep === 0);

  /* ── i18n ── */
  const tx = {
    title:   lang === "ar" ? "مهامي" : "My Tasks",
    weekly:  lang === "ar" ? "أسبوعي" : "Weekly",
    monthly: lang === "ar" ? "شهري"   : "Monthly",
    empty:   lang === "ar" ? "لا توجد مهام في هذه الفترة" : "No tasks in this period",
  };

  const views: { key: View; label: string }[] = [
    { key: "weekly",  label: tx.weekly  },
    { key: "monthly", label: tx.monthly },
  ];

  const visibleTasks = tasks.filter(t => getBarPct(t) !== null);

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background:       bg,
        border:           `1px solid ${border}`,
        userSelect:       "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-4 py-3 flex flex-wrap items-center gap-3"
        style={{
          background:    headerBg,
          borderBottom:  `1px solid ${divider}`,
          flexDirection: "row",
        }}
      >
        {/* Title + nav */}
        <div className="flex items-center gap-2" style={{ flexDirection: "row" }}>
          <h2
            className="text-sm font-bold uppercase tracking-widest"
            style={{
              color:      textMain,
              fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit",
            }}
          >
            {tx.title}
          </h2>

          <span className="text-[11px] font-semibold" style={{ color: textMuted }}>
            {fmtMonth(anchor, lang)}
          </span>

          <div className="flex items-center gap-0.5">
            {([
              { dir: -1 as const, Icon: isRTL ? ChevronRight : ChevronLeft  },
              { dir:  1 as const, Icon: isRTL ? ChevronLeft  : ChevronRight },
            ] as const).map(({ dir, Icon }, i) => (
              <button
                key={i}
                onClick={() => navigate(dir)}
                className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                style={{ color: textMuted }}
                onMouseEnter={e => {
                  e.currentTarget.style.color      = textMain;
                  e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color      = textMuted;
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>

        {/* View toggle */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)" }}
        >
          {views.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
              style={{
                background: view === v.key ? accentColor  : "transparent",
                color:      view === v.key ? "#ffffff"    : textMuted,
                fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit",
              }}
            >
              {v.label}
            </button>
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
                <div
                  key={i}
                  className="flex-1 text-center py-2"
                  style={{
                    fontSize:     "9px",
                    fontWeight:   700,
                    letterSpacing:"0.05em",
                    color: day.toDateString() === new Date().toDateString()
                      ? accentColor
                      : textMuted,
                  }}
                >
                  {fmt(day, lang)}
                </div>
              ))}
            </div>
          </div>

          {/* ── Scrollable task rows — fixed height = 5 rows ── */}
          <div
            className="overflow-y-auto custom-scrollbar"
            style={{ height: `${SCROLL_H}px` }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                /* min-height fills the viewport even when tasks < 5 */
                style={{ minHeight: `${SCROLL_H}px` }}
              >
                {visibleTasks.length === 0 ? (
                  /* Empty state — still occupies full fixed height */
                  <div
                    className="flex items-center justify-center text-[11px] font-medium"
                    style={{
                      height:     `${SCROLL_H}px`,
                      color:      textMuted,
                      fontFamily: lang === "ar" ? "var(--font-arabic)" : "inherit",
                    }}
                  >
                    {tx.empty}
                  </div>
                ) : (
                  visibleTasks.map((task, tIdx) => {
                    const pos = getBarPct(task)!;

                    const barWrapStyle: React.CSSProperties = {
                      position:  "absolute",
                      height:    `${BAR_H}px`,
                      top:       "50%",
                      width:     `${pos.widthPct}%`,
                      transform: "translateY(-50%)",
                    };
                    if (isRTL) barWrapStyle.right = `${pos.startPct}%`;
                    else       barWrapStyle.left  = `${pos.startPct}%`;

                    return (
                      <div
                        key={task.id}
                        className="flex items-center"
                        style={{
                          height:       `${ROW_H}px`,
                          borderBottom: `1px solid ${divider}`,
                        }}
                      >
                        {/* Task bar area — full width */}
                        <div className="flex-1 relative" style={{ height: `${ROW_H}px` }}>

                          {/* Today line */}
                          {todayPct !== null && (
                            <div
                              className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
                              style={{
                                [isRTL ? "right" : "left"]: `${todayPct}%`,
                                background: `${accentColor}50`,
                              }}
                            />
                          )}

                          {/* Grey track */}
                          <div
                            className="absolute inset-x-2 rounded-full"
                            style={{
                              height:    `${TRACK_H}px`,
                              top:       "50%",
                              transform: "translateY(-50%)",
                              background: trackBg,
                            }}
                          />

                          {/* Coloured bar */}
                          <div style={barWrapStyle}>
                            <motion.div
                              initial={false}
                              animate={{ scaleX: 1, opacity: 0.9 }}
                              transition={{
                                duration: 0.5,
                                ease:     [0.22, 1, 0.36, 1],
                                delay:    tIdx * 0.05,
                              }}
                              whileHover={{ opacity: 1 }}
                              style={{
                                width:        "100%",
                                height:       "100%",
                                display:      "flex",
                                alignItems:   "center",
                                overflow:     "hidden",
                                background:   task.color,
                                borderRadius: "999px",
                                cursor:       "default",
                                boxShadow:    `0 2px 8px ${task.color}50`,
                                transformOrigin: isRTL ? "right center" : "left center",
                                paddingLeft:  isRTL ? "6px" : "10px",
                                paddingRight: isRTL ? "10px" : "6px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize:     "9px",
                                  fontWeight:   700,
                                  color:        "rgba(255,255,255,0.95)",
                                  whiteSpace:   "nowrap",
                                  overflow:     "hidden",
                                  textOverflow: "ellipsis",
                                  letterSpacing:"0.02em",
                                  textShadow:   "0 1px 4px rgba(0,0,0,0.5)",
                                  fontFamily:   lang === "ar" ? "var(--font-arabic)" : "inherit",
                                  direction:    isRTL ? "rtl" : "ltr",
                                  pointerEvents:"none",
                                }}
                              >
                                {lang === "ar" ? task.titleAr : task.title}
                              </span>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer weekday labels */}
          <div className="flex" style={{ borderTop: `1px solid ${divider}` }}>
            <div className="flex-1 flex">
              {labelDays.map((day, i) => (
                <div
                  key={i}
                  className="flex-1 text-center py-1.5"
                  style={{
                    fontSize:  "9px",
                    fontWeight: 600,
                    opacity:   0.55,
                    color: day.toDateString() === new Date().toDateString()
                      ? accentColor
                      : textMuted,
                  }}
                >
                  {view === "monthly"
                    ? day.getDate()
                    : day.toLocaleDateString(
                        lang === "ar" ? "ar-SA" : "en-US",
                        { weekday: "short" },
                      )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}