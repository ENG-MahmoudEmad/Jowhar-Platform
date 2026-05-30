"use client";

import React, { memo, useMemo } from 'react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { ChevronRight, Users } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

type TeamMember = {
  id: number;
  name: string;
  initials: string;
  role: string;
  roleAr: string;
  progress: number;
  color: string;
  tasks: number;
};

type Lang = 'en' | 'ar';
type TeamProgressStyle = React.CSSProperties & Record<`--team-${string}`, string>;
type MemberRowStyle = React.CSSProperties & Record<'--member-color', string>;

const TEAM_MEMBERS: TeamMember[] = [
  { id: 1, name: 'Ahmed', initials: 'AH', role: 'Lead Animator', roleAr: 'محرك رئيسي', progress: 85, color: '#458482', tasks: 12 },
  { id: 2, name: 'Sarah', initials: 'SA', role: '3D Modeler', roleAr: 'مصممة ثلاثية', progress: 65, color: '#f59e0b', tasks: 8 },
  { id: 3, name: 'Omar', initials: 'OM', role: 'VFX Artist', roleAr: 'فنان مؤثرات', progress: 40, color: '#ef4444', tasks: 4 },
  { id: 4, name: 'Lina', initials: 'LI', role: 'Concept Artist', roleAr: 'فنانة مفاهيم', progress: 92, color: '#458482', tasks: 15 },
];

const CARD_TRANSITION = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const PROGRESS_TRANSITION = {
  duration: 0.8,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const TEXT = {
  en: {
    title: 'Team Performance',
    subtitle: 'Workload distribution per artist',
    manage: 'Manage Team',
    report: 'View full report',
    activeTasks: (count: number) => `${count} Active Tasks`,
  },
  ar: {
    title: 'أداء الفريق',
    subtitle: 'توزيع العمل على الفنانين',
    manage: 'إدارة الفريق',
    report: 'عرض التقرير الكامل',
    activeTasks: (count: number) => `${count} مهمة نشطة`,
  },
} satisfies Record<Lang, {
  title: string;
  subtitle: string;
  manage: string;
  report: string;
  activeTasks: (count: number) => string;
}>;

function getPalette(isDark: boolean): TeamProgressStyle {
  return {
    '--team-bg': isDark ? 'var(--card)' : '#ffffff',
    '--team-border': isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)',
    '--team-header-bg': isDark ? 'var(--background-alt)' : '#f5f5ef',
    '--team-divider': isDark ? 'var(--divider)' : 'rgba(0,0,0,0.06)',
    '--team-track-bg': isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    '--team-avatar-bg': isDark ? 'var(--background)' : '#e8e8e1',
    '--team-avatar-border': isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    '--team-progress-border': isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    '--team-row-hover': isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    '--team-text-main': 'var(--foreground)',
    '--team-text-muted': 'var(--foreground-muted)',
    '--team-footer-bg': isDark ? 'rgba(13,17,23,0.5)' : 'rgba(249,249,243,0.8)',
    background: 'var(--team-bg)',
    border: '1px solid var(--team-border)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };
}

const TeamMemberRow = memo(function TeamMemberRow({
  member,
  index,
  isLast,
  isRTL,
  lang,
  activeTasksLabel,
}: {
  member: TeamMember;
  index: number;
  isLast: boolean;
  isRTL: boolean;
  lang: Lang;
  activeTasksLabel: string;
}) {
  const rowStyle: MemberRowStyle = {
    '--member-color': member.color,
    borderBottom: isLast ? 'none' : '1px solid var(--team-divider)',
  };

  return (
    <div
      className="p-4 sm:p-5 transition-colors hover:bg-[var(--team-row-hover)]"
      style={rowStyle}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-[#458482] transition-colors bg-[var(--team-avatar-bg)] border border-[var(--team-avatar-border)]">
              {member.initials}
            </div>

            <div className="min-w-0 text-start">
              <h4 className="truncate text-sm font-bold text-[var(--team-text-main)]">
                {member.name}
              </h4>
              <p
                className="text-[10px] font-medium tracking-wider text-[var(--team-text-muted)]"
                style={{
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                  textTransform: lang === 'ar' ? 'none' : 'uppercase',
                }}
              >
                {lang === 'ar' ? member.roleAr : member.role}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-end">
            <span className="font-mono text-xs font-bold text-[var(--team-text-main)]">
              {member.progress}%
            </span>
            <p
              className="text-[9px] font-black tracking-tight text-[var(--team-text-muted)]"
              style={{
                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                textTransform: lang === 'ar' ? 'none' : 'uppercase',
              }}
            >
              {activeTasksLabel}
            </p>
          </div>
        </div>

        <div
          role="progressbar"
          aria-label={`${member.name} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={member.progress}
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--team-track-bg)] border border-[var(--team-progress-border)]"
        >
          <m.div
            initial={false}
            animate={{ width: `${member.progress}%` }}
            transition={{ ...PROGRESS_TRANSITION, delay: index * 0.08 + 0.2 }}
            className="absolute top-0 h-full rounded-full bg-[var(--member-color)]"
            style={{ [isRTL ? 'right' : 'left']: 0 }}
          />
        </div>
      </div>
    </div>
  );
});

function TeamProgress() {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';
  const copy = TEXT[lang];
  const palette = useMemo(() => getPalette(isDark), [isDark]);

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        initial={{ opacity: 0, y: 20, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={CARD_TRANSITION}
        dir={isRTL ? 'rtl' : 'ltr'}
        aria-labelledby="team-progress-title"
        className="w-full overflow-hidden rounded-2xl"
        style={palette}
      >
        <div className="flex items-center justify-between gap-4 p-5 sm:p-6 bg-[var(--team-header-bg)] border-b border-[var(--team-divider)]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-lg bg-[rgba(69,132,130,0.1)] p-2">
              <Users size={18} className="text-[#458482]" aria-hidden="true" />
            </div>
            <div className="min-w-0 text-start">
              <h2
                id="team-progress-title"
                className="text-sm font-bold uppercase tracking-widest text-[var(--team-text-main)]"
                style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
              >
                {copy.title}
              </h2>
              <p className="mt-0.5 text-[10px] font-medium text-[var(--team-text-muted)]">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="shrink-0 cursor-pointer text-[10px] font-black uppercase tracking-tight text-[var(--team-text-muted)] transition-colors hover:text-[#458482]"
            style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {copy.manage}
          </button>
        </div>

        <div className="bg-[var(--team-bg)]">
          {TEAM_MEMBERS.map((member, index) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              index={index}
              isLast={index === TEAM_MEMBERS.length - 1}
              isRTL={isRTL}
              lang={lang}
              activeTasksLabel={copy.activeTasks(member.tasks)}
            />
          ))}
        </div>

        <div className="flex justify-center p-4 bg-[var(--team-footer-bg)] border-t border-[var(--team-divider)]">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#458482] transition-[gap] hover:gap-3"
            style={{
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              textTransform: lang === 'ar' ? 'none' : 'uppercase',
            }}
          >
            {copy.report}
            <ChevronRight
              size={13}
              aria-hidden="true"
              style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}
            />
          </button>
        </div>
      </m.section>
    </LazyMotion>
  );
}

export default memo(TeamProgress);