//src\components\dashboard\my-tasks\TodayFocusCard.tsx
"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { useLang } from "@/context/LangContext";
import { getTodayFocusCounts, type Task } from "@/lib/taskStats";

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

// "Due" اتشالت — استبدلناها بـ"قيد المراجعة" (pending_review)، أنسب
// دلاليًا: العضو أصلاً سلّم شغله، مش لسا محتاج "تذكير بالموعد".
const STAT_META = [
  { key: "open", labelEn: "Open", labelAr: "مفتوحة" },
  { key: "pendingReview", labelEn: "In Review", labelAr: "قيد المراجعة" },
  { key: "done", labelEn: "Done", labelAr: "منجزة" },
] as const;

/* ─── Headline copy ─────────────────────────────────────────────────────────
   قبل: مبنية على عدّاد "Due" (تاسكات قربت مواعيدها). بعد إزالة مفهوم Due من
   هالكارت، أصبحت مبنية على OPEN — أنسب بديل: "لسا مفتوحة" هي فعليًا التاسكات
   اللي بتحتاج فعل من العضو (شغل لسا ما بلّش/ما انسلّم)، بعكس pending_review
   اللي أصلاً بانتظار غيره.
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

function TodayFocusCard({ tasks }: { tasks: Task[] }) {
  const { lang, isRTL } = useLang();
  const router = useRouter();
  const isArabic = lang === "ar";
  const textFont = isArabic ? "var(--font-arabic)" : "inherit";

  /* نفس نمط فتح إشعار (router.push(n.href)) — الكارد كامل بوابة لصفحة
     القائمة الكاملة (/my-tasks/list)، مش بس عرض عددّات. */
  const handleOpenList = () => router.push("/my-tasks/list");

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
        onClick={handleOpenList}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleOpenList();
        }}
        className="min-h-[210px] rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
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
              ? getHeadline(counts.open, isArabic)
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