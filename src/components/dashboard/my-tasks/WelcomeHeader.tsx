"use client";

import { memo, useMemo } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { useLang }  from "@/context/LangContext";
import DiamondGem   from "./DiamondGem";

interface WelcomeHeaderProps {
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
      fontSize:      "clamp(2rem, 4vw, 3rem)",
      color:         "var(--foreground)",
      fontFamily:    lang === "ar" ? "var(--font-arabic)" : "var(--font-display)",
      letterSpacing: lang === "ar" ? "0" : "-0.02em",
    }),
    [lang]
  );

  const nameTextStyle = useMemo<React.CSSProperties>(
    () => ({
      fontSize:      "clamp(2rem, 4vw, 3rem)",
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
      <div dir={isRTL ? "rtl" : "ltr"} className="flex items-center gap-6">

        {/* Gem */}
        <m.div initial={GEM_INITIAL} animate={GEM_ANIMATE} transition={GEM_TRANSITION}>
          <DiamondGem
            memberColor={memberColor}
            size={130}
            floatDelay={0}
            isDark={isDark}
          />
        </m.div>

        {/* Text block */}
        <m.div
          className="flex flex-col"
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
            className="font-black leading-tight"
            style={nameTextStyle}
          >
            {displayName}
          </m.span>
        </m.div>

      </div>
    </LazyMotion>
  );
}

export default memo(WelcomeHeader);