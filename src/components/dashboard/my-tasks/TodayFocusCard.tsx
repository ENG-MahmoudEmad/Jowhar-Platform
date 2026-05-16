"use client";

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
        <p
          className="text-[10px] font-black uppercase tracking-[0.18em] mb-2"
          style={{
            color: "var(--foreground-muted)",
            fontFamily: textFont,
            fontWeight: isArabic ? 700 : 900,
            letterSpacing: isArabic ? "0" : "0.18em",
          }}
        >
          {isArabic ? "تركيز اليوم" : "Today Focus"}
        </p>
        <h2
          className="text-xl leading-tight"
          style={{
            fontFamily: textFont,
            fontWeight: isArabic ? 700 : 900,
            letterSpacing: 0,
          }}
        >
          {isArabic ? "٤ مهام تحتاج انتباهك" : "4 tasks need your attention"}
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {focusStats.map(({ value, labelEn, labelAr }) => {
          const label = isArabic ? labelAr : labelEn;

          return (
          <div
            key={label}
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
          </div>
          );
        })}
      </div>
    </div>
  );
}
