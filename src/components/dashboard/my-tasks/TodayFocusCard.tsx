"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { useLang } from "@/context/LangContext";
import { getTodayFocusCounts, type Task } from "@/lib/taskStats";

/* ─── Mock data ─────────────────────────────────────────────────────────────
   Replace with the member's real tasks (passed in as the `tasks` prop, or
   fetched here once the API exists). Dates are generated relative to today so
   every counter has something to count regardless of when this runs.
   ───────────────────────────────────────────────────────────────────────────── */
function isoOffsetDays(days: number, hour = 18): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

const MOCK_TASKS: Task[] = [
  // Overdue and unfinished → counts in OPEN and DUE
  { id: "1", title: "Character Rigging", titleAr: "تحريك الشخصية", status: "in-progress", deadline: isoOffsetDays(-3), completedAt: null },
  // Due today → OPEN + DUE
  { id: "2", title: "Walk Cycle", titleAr: "دورة المشي", status: "todo", deadline: isoOffsetDays(0), completedAt: null },
  // Within 7 days → OPEN + DUE
  { id: "3", title: "Texture Mapping", titleAr: "خرائط النسيج", status: "todo", deadline: isoOffsetDays(4), completedAt: null },
  { id: "4", title: "Motion Blur VFX", titleAr: "تأثير التمويه", status: "in-progress", deadline: isoOffsetDays(6), completedAt: null },
  // Beyond the 7-day horizon → OPEN only
  { id: "5", title: "Color Grading", titleAr: "تصحيح الألوان", status: "todo", deadline: isoOffsetDays(14), completedAt: null },
  { id: "6", title: "Sound Design", titleAr: "تصميم الصوت", status: "todo", deadline: isoOffsetDays(21), completedAt: null },
  // Completed this month → DONE only
  { id: "7", title: "Concept Sketches", titleAr: "رسومات أولية", status: "done", deadline: isoOffsetDays(-10), completedAt: isoOffsetDays(-9) },
  { id: "8", title: "Storyboard", titleAr: "القصة المصورة", status: "done", deadline: isoOffsetDays(-8), completedAt: isoOffsetDays(-6) },
  { id: "9", title: "Layout Pass", titleAr: "مرحلة التخطيط", status: "done", deadline: isoOffsetDays(-5), completedAt: isoOffsetDays(-2) },
  // Deadline was last month but closed recently → still counts in THIS month's DONE
  { id: "10", title: "Asset Cleanup", titleAr: "تنظيف الملفات", status: "done", deadline: isoOffsetDays(-40), completedAt: isoOffsetDays(-1) },
];

// ─── Module-level constants (zero per-render allocation) ───────────────────────
const TEXT_MUTED = "var(--foreground-muted)";
const PLACEHOLDER = "–";

const CARD_STYLE: React.CSSProperties = {
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
};

const STAT_CARD_STYLE: React.CSSProperties = {
  background: "var(--hover-bg)",
  border: "1px solid var(--divider)",
};

const STAT_META = [
  { key: "open", labelEn: "Open", labelAr: "مفتوحة" },
  { key: "due", labelEn: "Due", labelAr: "مستحقة" },
  { key: "done", labelEn: "Done", labelAr: "منجزة" },
] as const;

/* ─── Headline copy ─────────────────────────────────────────────────────────
   Driven by the DUE count — that is the number of tasks actually needing
   attention right now, which is what the sentence claims.
   ───────────────────────────────────────────────────────────────────────────── */
function getHeadline(count: number, isArabic: boolean): string {
  if (isArabic) {
    // Arabic pluralisation: 0 / 1 / 2 / 3–10 / 11+ each take a different form.
    if (count === 0) return "لا مهام تحتاج انتباهك";
    if (count === 1) return "مهمة واحدة تحتاج انتباهك";
    if (count === 2) return "مهمتان تحتاجان انتباهك";
    const arabicCount = count.toLocaleString("ar-EG");
    if (count <= 10) return `${arabicCount} مهام تحتاج انتباهك`;
    return `${arabicCount} مهمة تحتاج انتباهك`;
  }

  if (count === 0) return "No tasks need your attention";
  if (count === 1) return "1 task needs your attention";
  return `${count} tasks need your attention`;
}

// ─── Stat card subcomponent ─────────────────────────────────────────────────────
const FocusStatCard = memo(function FocusStatCard({ value, label, index, isArabic, textFont }: {
  value: string; label: string; index: number; isArabic: boolean; textFont: string;
}) {
  const labelStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MUTED, fontFamily: textFont, fontWeight: 700,
    letterSpacing: isArabic ? "0" : "0.14em",
  }), [textFont, isArabic]);

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24 + index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl px-3 py-4"
      style={STAT_CARD_STYLE}
    >
      <div className="text-2xl font-black text-[#7fc9c4] leading-none">
        {value}
      </div>
      <div
        className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em]"
        style={labelStyle}
      >
        {label}
      </div>
    </m.div>
  );
});

function TodayFocusCard({ tasks = MOCK_TASKS }: { tasks?: Task[] }) {
  const { lang, isRTL } = useLang();
  const isArabic = lang === "ar";
  const textFont = isArabic ? "var(--font-arabic)" : "inherit";

  /* Counts depend on the current date, which the server and the browser can
     disagree about. Resolving "today" only after mount keeps hydration clean —
     the same approach already used by DeadlineCountdown. */
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
  }, []);

  const counts = useMemo(
    () => (today ? getTodayFocusCounts(tasks, today) : null),
    [tasks, today],
  );

  const focusLabelStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MUTED,
    fontFamily: textFont,
    fontWeight: isArabic ? 700 : 900,
    letterSpacing: isArabic ? "0" : "0.18em",
  }), [textFont, isArabic]);

  const headingStyle = useMemo<React.CSSProperties>(() => ({
    fontFamily: textFont,
    fontWeight: isArabic ? 700 : 900,
    letterSpacing: 0,
  }), [textFont, isArabic]);

  return (
    <LazyMotion features={domAnimation}>
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="min-h-[210px] rounded-2xl p-6 flex flex-col justify-between"
        style={CARD_STYLE}
      >
        <div>
          <m.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.35 }}
            className="text-[10px] font-black uppercase tracking-[0.18em] mb-2"
            style={focusLabelStyle}
          >
            {isArabic ? "تركيز اليوم" : "Today Focus"}
          </m.p>
          <m.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-xl leading-tight"
            style={headingStyle}
          >
            {counts
              ? getHeadline(counts.due, isArabic)
              : isArabic ? "جارٍ حساب مهامك" : "Checking your tasks"}
          </m.h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {STAT_META.map(({ key, labelEn, labelAr }, index) => (
            <FocusStatCard
              key={key}
              value={counts ? String(counts[key]) : PLACEHOLDER}
              label={isArabic ? labelAr : labelEn}
              index={index}
              isArabic={isArabic}
              textFont={textFont}
            />
          ))}
        </div>
      </div>
    </LazyMotion>
  );
}

export default memo(TodayFocusCard);