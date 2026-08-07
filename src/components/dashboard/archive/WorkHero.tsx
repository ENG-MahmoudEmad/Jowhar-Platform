"use client"

import { memo, useCallback, useMemo } from "react"
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { ChevronRight, FolderOpen, FileStack } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { useRouter } from 'next/navigation'
import type { Work } from '@/components/dashboard/archive/WorksGrid'

// ─── Module-level constants (zero per-render allocation) ───────────────────────
const TEXT_MAIN  = "var(--foreground)";
const TEXT_MUTED = "var(--foreground-muted)";
const TEXT_MAIN_STYLE: React.CSSProperties = { color: TEXT_MAIN };
const STAT_VALUE_STYLE: React.CSSProperties = { color: TEXT_MAIN, lineHeight: 1 };
const BACK_LINK_STYLE: React.CSSProperties = { color: TEXT_MUTED, transition: 'color 0.2s' };

const GRID_PATTERN_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px),
                    linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
  backgroundSize: '40px 40px',
};

function handleBackLinkLeave(e: React.MouseEvent<HTMLSpanElement>) {
  e.currentTarget.style.color = TEXT_MUTED;
}

interface StatItem {
  id: string;
  value: number;
  label: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

const StatCard = memo(function StatCard({ value, label, Icon, cardStyle, iconStyle, labelStyle }: {
  value: number; label: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  cardStyle: React.CSSProperties; iconStyle: React.CSSProperties; labelStyle: React.CSSProperties;
}) {
  return (
    <div className="text-center px-4 py-3 rounded-xl" style={cardStyle}>
      <Icon className="w-4 h-4 mx-auto mb-1" style={iconStyle} />
      <div className="text-2xl font-black" style={STAT_VALUE_STYLE}>{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-widest mt-1" style={labelStyle}>{label}</div>
    </div>
  );
});

function WorkHero({
  work,
  platformSlug,
  platformName,
  color,
}: {
  work:         Work
  platformSlug: string
  platformName: string
  color:        string
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const router          = useRouter()
  const isDark          = theme === 'dark'

  const name        = lang === 'ar' ? work.nameAr : work.nameEn
  const description = lang === 'ar' ? work.descriptionAr : work.description
  const c            = color

  const tx = useMemo(() => ({
    archive:   lang === 'ar' ? 'الأرشيف'  : 'Archive',
    workLabel: lang === 'ar' ? 'عمل'       : 'Work',
    sections:  lang === 'ar' ? 'تقسيم'    : 'Sections',
    files:     lang === 'ar' ? 'ملف'      : 'Files',
  }), [lang]);

  const handleBackLinkEnter = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    e.currentTarget.style.color = c;
  }, [c]);

  const handlePlatformLinkEnter = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    e.currentTarget.style.color = c;
  }, [c]);

  const wrapperStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark
      ? `linear-gradient(135deg, #161b22 0%, ${c}18 100%)`
      : `linear-gradient(135deg, #f5f5ef 0%, ${c}12 100%)`,
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
  }), [isDark, c]);

  const ambientGlowStyle = useMemo<React.CSSProperties>(() => ({
    background: `radial-gradient(ellipse 70% 90% at ${isRTL ? '80%' : '20%'} 50%, ${c}18, transparent)`,
  }), [isRTL, c]);

  const accentLineStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${c}, transparent)`,
  }), [isRTL, c]);

  const breadcrumbStyle = useMemo<React.CSSProperties>(() => ({
    top: '16px',
    [isRTL ? 'right' : 'left']: '32px',
    color: TEXT_MUTED,
  }), [isRTL]);

  const logoWrapStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(135deg, ${c}30, ${c}15)`,
    border:     `1px solid ${c}40`,
    boxShadow:  `0 8px 32px ${c}30`,
  }), [c]);

  const fallbackLetterStyle = useMemo<React.CSSProperties>(() => ({
    color: c, fontFamily: 'var(--font-display)',
  }), [c]);

  const workLabelStyle = useMemo<React.CSSProperties>(() => ({
    color: c, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [c, lang]);

  const titleStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MAIN,
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
    letterSpacing: lang === 'ar' ? 0 : '-0.02em',
  }), [lang]);

  const mutedTextStyle = useMemo<React.CSSProperties>(() => ({
    color: TEXT_MUTED, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [lang]);

  const statCardStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
  }), [isDark]);

  const statIconStyle = useMemo<React.CSSProperties>(() => ({ color: c }), [c]);

  const statsItems: StatItem[] = useMemo(() => ([
    { id: 'sections', value: work.sectionCount, label: tx.sections, Icon: FolderOpen },
    { id: 'files',    value: work.fileCount,    label: tx.files,    Icon: FileStack  },
  ]), [work.sectionCount, work.fileCount, tx]);

  const handleArchiveClick = useCallback(() => router.push('/archive'), [router]);
  const handlePlatformClick = useCallback(() => router.push(`/archive/${platformSlug}`), [router, platformSlug]);

  return (
    <LazyMotion features={domAnimation}>
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="relative overflow-hidden rounded-2xl select-none"
        style={wrapperStyle}
      >
        <div className="absolute inset-0 pointer-events-none" style={ambientGlowStyle} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={GRID_PATTERN_STYLE} />
        <div className="absolute top-0 inset-x-0 h-0.5" style={accentLineStyle} />

        <div className="relative px-8 pt-12 pb-7 flex flex-col sm:flex-row items-start sm:items-center gap-6">

          {/* Breadcrumb: Archive > Platform > Work */}
          <div
            className="absolute flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
            style={breadcrumbStyle}
          >
            <span
              style={BACK_LINK_STYLE}
              onMouseEnter={handleBackLinkEnter}
              onMouseLeave={handleBackLinkLeave}
              onClick={handleArchiveClick}
              className="cursor-pointer"
            >
              {tx.archive}
            </span>
            <ChevronRight className="w-3 h-3" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
            <span
              style={BACK_LINK_STYLE}
              onMouseEnter={handlePlatformLinkEnter}
              onMouseLeave={handleBackLinkLeave}
              onClick={handlePlatformClick}
              className="cursor-pointer"
            >
              {platformName}
            </span>
            <ChevronRight className="w-3 h-3" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
            <span style={TEXT_MAIN_STYLE}>{name}</span>
          </div>

          {/* Logo / thumbnail */}
          <m.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 sm:mt-0 w-20 h-20 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center"
            style={logoWrapStyle}
          >
            {work.thumbnail
              ? <img src={work.thumbnail} alt={name} className="w-full h-full object-cover" />
              : <span className="text-4xl font-black select-none" style={fallbackLetterStyle}>
                  {name.charAt(0)}
                </span>
            }
          </m.div>

          {/* Text */}
          <div className="flex-1 mt-4 sm:mt-0">
            <m.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-[10px] font-black uppercase tracking-[0.2em] mb-1"
              style={workLabelStyle}
            >
              {tx.workLabel}
            </m.p>

            <m.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-3xl font-black mb-2"
              style={titleStyle}
            >
              {name}
            </m.h1>

            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm"
              style={mutedTextStyle}
            >
              {description}
            </m.p>
          </div>

          {/* Stats */}
          <m.div
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="flex gap-3 shrink-0"
          >
            {statsItems.map(({ id, value, label, Icon }) => (
              <StatCard
                key={id}
                value={value}
                label={label}
                Icon={Icon}
                cardStyle={statCardStyle}
                iconStyle={statIconStyle}
                labelStyle={mutedTextStyle}
              />
            ))}
          </m.div>

        </div>
      </div>
    </LazyMotion>
  )
}

export default memo(WorkHero)