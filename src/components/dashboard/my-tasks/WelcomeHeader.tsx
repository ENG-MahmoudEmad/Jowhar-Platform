"use client";

import { memo, useMemo } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { useLang }  from "@/context/LangContext";
import DiamondGem   from "./DiamondGem";

interface WelcomeHeaderProps {
  /** الاسم الأول فقط — الاسم الكامل بيطلع برّا الإطار مع الأسماء الطويلة */
  name:    string;
  nameAr?: string;
  hue:     number;
  sat?:    number;
}

// ─── Module-level constants ───────────────────────────────────────────────────
const TEXT_BLOCK_GAP_STYLE: React.CSSProperties = { gap: "2px" };

const TEXT_BLOCK_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
};

const LINE_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0 },
};
const LINE_TRANSITION = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

const GEM_INITIAL    = { opacity: 0, scale: 0.9, rotate: -4 };
const GEM_ANIMATE    = { opacity: 1, scale: 1,   rotate: 0  };
const GEM_TRANSITION = { delay: 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };

// ─── Helper ───────────────────────────────────────────────────────────────────
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (
    "#" +
    [f(0), f(8), f(4)]
      .map((x) => Math.round(x * 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
function WelcomeHeader({ name, nameAr, hue, sat = 45 }: WelcomeHeaderProps) {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark          = theme === "dark";

  const memberColor = hslToHex(hue, sat, isDark ? 55 : 45);

  const nameColor = isDark
    ? `hsl(${hue}, ${sat}%, 65%)`
    : `hsl(${hue}, ${sat + 10}%, 38%)`;

  const displayName = lang === "ar" && nameAr ? nameAr : name;
  const welcomeText = lang === "ar" ? "مرحباً" : "Welcome";

  const welcomeTextStyle = useMemo<React.CSSProperties>(
    () => ({
      fontSize:      "clamp(1.5rem, 3.2vw, 2.5rem)",
      color:         "var(--foreground)",
      fontFamily:    lang === "ar" ? "var(--font-arabic)" : "var(--font-display)",
      letterSpacing: lang === "ar" ? "0" : "-0.02em",
    }),
    [lang]
  );

  /*
    الاسم أصغر من "Welcome" عن قصد: هو الجزء المتغيّر واللي ممكن يطول،
    فتصغيره بيمنع الكسر قبل ما يبلّش. ومع `truncate` بيصير في سقف أكيد
    مهما كان الاسم طويل.
  */
  const nameTextStyle = useMemo<React.CSSProperties>(
    () => ({
      fontSize:      "clamp(1.25rem, 2.6vw, 2rem)",
      color:         nameColor,
      fontFamily:    lang === "ar" ? "var(--font-arabic)" : "var(--font-display)",
      letterSpacing: lang === "ar" ? "0" : "-0.02em",
      textShadow:    isDark
        ? `0 0 32px hsl(${hue}, ${sat}%, 55%, 0.35)`
        : `0 2px 12px hsl(${hue}, ${sat}%, 55%, 0.2)`,
    }),
    [lang, nameColor, isDark, hue, sat]
  );

  return (
    <LazyMotion features={domAnimation}>
      {/*
        min-w-0 على الحاوية وعلى كتلة النص: بدونها عنصر الـ flex بيرفض
        ينكمش تحت عرض محتواه، فالـ truncate ما بيشتغل إطلاقًا والنص
        بيطلع برّا الكارد.
      */}
      <div dir={isRTL ? "rtl" : "ltr"} className="flex min-w-0 items-center gap-4 sm:gap-6">

        {/* Gem — أصغر على الموبايل عشان يترك مساحة للنص */}
        <m.div
          initial={GEM_INITIAL}
          animate={GEM_ANIMATE}
          transition={GEM_TRANSITION}
          className="shrink-0"
        >
          <div className="hidden sm:block">
            <DiamondGem memberColor={memberColor} size={130} floatDelay={0} isDark={isDark} />
          </div>
          <div className="sm:hidden">
            <DiamondGem memberColor={memberColor} size={88} floatDelay={0} isDark={isDark} />
          </div>
        </m.div>

        {/* Text block */}
        <m.div
          className="flex min-w-0 flex-col"
          initial="hidden"
          animate="show"
          variants={TEXT_BLOCK_VARIANTS}
          style={TEXT_BLOCK_GAP_STYLE}
        >
          <m.span
            variants={LINE_VARIANTS}
            transition={LINE_TRANSITION}
            className="font-bold leading-tight"
            style={welcomeTextStyle}
          >
            {welcomeText}
          </m.span>

          <m.span
            variants={LINE_VARIANTS}
            transition={LINE_TRANSITION}
            className="truncate font-black leading-tight"
            style={nameTextStyle}
            // الاسم الكامل بالهوفر لو انقص
            title={displayName}
          >
            {displayName}
          </m.span>
        </m.div>

      </div>
    </LazyMotion>
  );
}

export default memo(WelcomeHeader);