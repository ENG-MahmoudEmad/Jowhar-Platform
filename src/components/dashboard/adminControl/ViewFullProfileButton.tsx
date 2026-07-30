// src/components/dashboard/adminControl/ViewFullProfileButton.tsx
"use client";

import React, { memo, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { UserRound, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

type Lang = 'en' | 'ar';

type ButtonStyle = React.CSSProperties & Record<`--vp-${string}`, string>;

const CARD_TRANSITION = {
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const TEXT = {
  en: {
    label: 'View Full Profile',
    hint: 'Permissions, member color, lock toggles & danger zone',
  },
  ar: {
    label: 'عرض الملف الكامل',
    hint: 'الصلاحيات، لون العضو، خيارات القفل، ومنطقة الخطر',
  },
} satisfies Record<Lang, { label: string; hint: string }>;

function getPalette(isDark: boolean): ButtonStyle {
  return {
    '--vp-bg': isDark ? 'var(--card)' : '#ffffff',
    '--vp-border': isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)',
    '--vp-text-main': 'var(--foreground)',
    '--vp-text-muted': 'var(--foreground-muted)',
  };
}

function ViewFullProfileButton({ memberId }: { memberId: string | number }) {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';
  const copy = TEXT[lang as Lang];
  const palette = useMemo(() => getPalette(isDark), [isDark]);
  const router = useRouter();

  // Same route pattern used when clicking a member from the Members card
  // on the dashboard (router.push(`/profile/${member.id}`)) — this is just
  // a shortcut into that same profile page, no duplicated data here.
  const goToProfile = () => router.push(`/profile/${memberId}`);

  return (
    <LazyMotion features={domAnimation}>
      <m.button
        type="button"
        onClick={goToProfile}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={CARD_TRANSITION}
        dir={isRTL ? 'rtl' : 'ltr'}
        className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl p-5 text-start transition-colors hover:border-[#458482]/40 sm:p-6"
        style={{ background: 'var(--vp-bg)', border: '1px solid var(--vp-border)', ...palette }}
      >
        <div className="shrink-0 rounded-lg bg-[rgba(69,132,130,0.1)] p-2 transition-colors group-hover:bg-[rgba(69,132,130,0.18)]">
          <UserRound size={18} className="text-[#458482]" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h2
            className="text-sm font-bold uppercase tracking-widest text-[var(--vp-text-main)]"
            style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {copy.label}
          </h2>
          <p className="mt-0.5 truncate text-[10px] font-medium text-[var(--vp-text-muted)]">{copy.hint}</p>
        </div>

        <ChevronRight
          size={18}
          className="shrink-0 text-[var(--vp-text-muted)] transition-transform group-hover:translate-x-0.5"
          style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}
          aria-hidden="true"
        />
      </m.button>
    </LazyMotion>
  );
}

export default memo(ViewFullProfileButton); 