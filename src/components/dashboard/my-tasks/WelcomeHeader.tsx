"use client";

import { useTheme } from "@/context/ThemeContext";
import { useLang }  from "@/context/LangContext";
import DiamondGem   from "./DiamondGem";

interface WelcomeHeaderProps {
  /** Display name of the logged-in member */
  name:   string;
  /** Arabic display name */
  nameAr?: string;
  /** HSL hue 0-360 — drives both gem colour and name colour */
  hue:    number;
  /** HSL saturation 0-100 (default 45) */
  sat?:   number;
}

export default function WelcomeHeader({
  name,
  nameAr,
  hue,
  sat = 45,
}: WelcomeHeaderProps) {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark          = theme === "dark";

  /* Derive a readable name-colour from hue:
     dark mode  → light tint  (same as brand-light pattern)
     light mode → darker shade so it's legible on white bg  */
  const nameColor = isDark
    ? `hsl(${hue}, ${sat}%, 65%)`
    : `hsl(${hue}, ${sat + 10}%, 38%)`;

  const displayName = lang === "ar" && nameAr ? nameAr : name;

  const welcomeText = lang === "ar" ? "مرحباً" : "Welcome";

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="flex items-center gap-6"
    >
      {/* Gem */}
      <DiamondGem
        hue={hue}
        sat={sat}
        size={130}
        floatDelay={0}
        isDark={isDark}
      />

      {/* Text block */}
      <div className="flex flex-col" style={{ gap: "2px" }}>
        <span
          className="font-bold leading-tight"
          style={{
            fontSize:   "clamp(2rem, 4vw, 3rem)",
            color:      "var(--foreground)",
            fontFamily: lang === "ar" ? "var(--font-arabic)" : "var(--font-display)",
            letterSpacing: lang === "ar" ? "0" : "-0.02em",
          }}
        >
          {welcomeText}
        </span>

        <span
          className="font-black leading-tight"
          style={{
            fontSize:   "clamp(2rem, 4vw, 3rem)",
            color:      nameColor,
            fontFamily: lang === "ar" ? "var(--font-arabic)" : "var(--font-display)",
            letterSpacing: lang === "ar" ? "0" : "-0.02em",
            /* subtle text-shadow glow matching gem colour */
            textShadow: isDark
              ? `0 0 32px hsl(${hue}, ${sat}%, 55%, 0.35)`
              : `0 2px 12px hsl(${hue}, ${sat}%, 55%, 0.2)`,
          }}
        >
          {displayName}
        </span>
      </div>
    </div>
  );
}