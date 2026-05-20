"use client";

import { motion } from "framer-motion";
import { useLang } from "@/context/LangContext";

const focusStats = [
  { value: "12", labelEn: "Open", labelAr: "مفتوحة" },
  { value: "4", labelEn: "Due", labelAr: "مستحقة" },
  { value: "8", labelEn: "Done", labelAr: "منجزة" },
];

export default function TodayFocusCard() {
  const { lang, isRTL } = useLang();
  const isArabic = lang === "ar";
  const textFont = isArabic ? "var(--font-arabic)" : "inherit";

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-[210px] rounded-2xl p-6 flex flex-col justify-between"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
      }}
    >
      <div>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
          className="text-[10px] font-black uppercase tracking-[0.18em] mb-2"
          style={{
            color: "var(--foreground-muted)",
            fontFamily: textFont,
            fontWeight: isArabic ? 700 : 900,
            letterSpacing: isArabic ? "0" : "0.18em",
          }}
        >
          {isArabic ? "تركيز اليوم" : "Today Focus"}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-xl leading-tight"
          style={{
            fontFamily: textFont,
            fontWeight: isArabic ? 700 : 900,
            letterSpacing: 0,
          }}
        >
          {isArabic ? "٤ مهام تحتاج انتباهك" : "4 tasks need your attention"}
        </motion.h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {focusStats.map(({ value, labelEn, labelAr }, index) => {
          const label = isArabic ? labelAr : labelEn;

          return (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 + index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl px-3 py-4"
            style={{
              background: "var(--hover-bg)",
              border: "1px solid var(--divider)",
            }}
          >
            <div className="text-2xl font-black text-[#7fc9c4] leading-none">
              {value}
            </div>
            <div
              className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{
                color: "var(--foreground-muted)",
                fontFamily: textFont,
                fontWeight: 700,
                letterSpacing: isArabic ? "0" : "0.14em",
              }}
            >
              {label}
            </div>
          </motion.div>
          );
        })}
      </div>
    </div>
  );
}
