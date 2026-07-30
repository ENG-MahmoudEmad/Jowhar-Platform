"use client";

import React, { memo, useMemo, useState, useCallback } from 'react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { ChevronRight, Users, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

type TeamMember = {
  id: number;
  // Links this member record to their registered user account.
  // Populated automatically once the member signs up / is approved
  // (comes from the `users` table via Supabase once wired to the backend).
  userId: number | null;
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

// TODO: replace with the authenticated user's id from Auth/User context once available
// (this should match a member's `userId`, i.e. currentUser.id from Supabase auth)
const CURRENT_USER_ID = 1;

// Full team roster (used for the "all members" popup). Dashboard/Calendar
// only ever display the current user + 4 members alphabetically.
// `userId` links each member to their account in the `users` table — set to
// `null` for members who haven't completed signup yet (pending/invited),
// and populated automatically once they sign up / get approved.
const TEAM_MEMBERS: TeamMember[] = [
  { id: 1, userId: 1, name: 'Ahmed', initials: 'AH', role: 'Lead Animator', roleAr: 'محرك رئيسي', progress: 85, color: '#458482', tasks: 12 },
  { id: 2, userId: 2, name: 'Sarah', initials: 'SA', role: '3D Modeler', roleAr: 'مصممة ثلاثية', progress: 65, color: '#f59e0b', tasks: 8 },
  { id: 3, userId: 3, name: 'Omar', initials: 'OM', role: 'VFX Artist', roleAr: 'فنان مؤثرات', progress: 40, color: '#ef4444', tasks: 4 },
  { id: 4, userId: 4, name: 'Lina', initials: 'LI', role: 'Concept Artist', roleAr: 'فنانة مفاهيم', progress: 92, color: '#458482', tasks: 15 },
  { id: 5, userId: 5, name: 'Yusuf', initials: 'YU', role: 'Sound Designer', roleAr: 'مصمم صوت', progress: 58, color: '#8b5cf6', tasks: 6 },
  { id: 6, userId: 6, name: 'Nour', initials: 'NO', role: 'Storyboard Artist', roleAr: 'فنانة ستوري بورد', progress: 73, color: '#ec4899', tasks: 9 },
  { id: 7, userId: 7, name: 'Khaled', initials: 'KH', role: 'Rigger', roleAr: 'مصمم تجهيزات', progress: 51, color: '#3b82f6', tasks: 5 },
  { id: 8, userId: 8, name: 'Mariam', initials: 'MA', role: 'Editor', roleAr: 'مونتيرة', progress: 88, color: '#10b981', tasks: 11 },
  { id: 9, userId: 9, name: 'Hamza', initials: 'HA', role: 'Writer', roleAr: 'كاتب', progress: 34, color: '#f97316', tasks: 3 },
  { id: 10, userId: 10, name: 'Dana', initials: 'DA', role: 'Compositor', roleAr: 'مركبة مشاهد', progress: 79, color: '#06b6d4', tasks: 10 },
];

const DASHBOARD_MEMBER_LIMIT = 5; // current user + 4 others

// Progress bar color thresholds: 0–40% red, 40–70% yellow, 70%+ teal.
const PROGRESS_COLOR_LOW = '#ef4444';
const PROGRESS_COLOR_MID = '#f59e0b';
const PROGRESS_COLOR_HIGH = '#458482';

function getProgressColor(progress: number): string {
  if (progress < 40) return PROGRESS_COLOR_LOW;
  if (progress < 70) return PROGRESS_COLOR_MID;
  return PROGRESS_COLOR_HIGH;
}

/**
 * Sorts members so the current user is always first, followed by the rest
 * alphabetically by name. Optionally truncates to `limit` entries.
 */
function sortMembersForDisplay(
  members: TeamMember[],
  currentUserId: number,
  limit?: number
): TeamMember[] {
  const current = members.filter((m) => m.userId === currentUserId);
  const others = members
    .filter((m) => m.userId !== currentUserId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const ordered = [...current, ...others];
  return typeof limit === 'number' ? ordered.slice(0, limit) : ordered;
}

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
    allMembersTitle: 'All Team Members',
    close: 'Close',
  },
  ar: {
    title: 'أداء الفريق',
    subtitle: 'توزيع العمل على الفنانين',
    manage: 'إدارة الفريق',
    report: 'عرض التقرير الكامل',
    activeTasks: (count: number) => `${count} مهمة نشطة`,
    allMembersTitle: 'كل أعضاء الفريق',
    close: 'إغلاق',
  },
} satisfies Record<Lang, {
  title: string;
  subtitle: string;
  manage: string;
  report: string;
  activeTasks: (count: number) => string;
  allMembersTitle: string;
  close: string;
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
  isCurrentUser,
}: {
  member: TeamMember;
  index: number;
  isLast: boolean;
  isRTL: boolean;
  lang: Lang;
  activeTasksLabel: string;
  isCurrentUser?: boolean;
}) {
  const rowStyle: MemberRowStyle = {
    '--member-color': getProgressColor(member.progress),
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
              <h4 className="truncate text-sm font-bold text-[var(--team-text-main)] flex items-center gap-1.5">
                {member.name}
                {isCurrentUser && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#458482]" aria-hidden="true" />
                )}
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const dashboardMembers = useMemo(
    () => sortMembersForDisplay(TEAM_MEMBERS, CURRENT_USER_ID, DASHBOARD_MEMBER_LIMIT),
    []
  );

  const allMembersSorted = useMemo(
    () => sortMembersForDisplay(TEAM_MEMBERS, CURRENT_USER_ID),
    []
  );

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        initial={{ opacity: 0, y: 20, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={CARD_TRANSITION}
        dir={isRTL ? 'rtl' : 'ltr'}
        aria-labelledby="team-progress-title"
        role="button"
        tabIndex={0}
        onClick={openModal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal();
          }
        }}
        className="w-full overflow-hidden rounded-2xl cursor-pointer"
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
            onClick={stopPropagation}
            className="shrink-0 cursor-pointer text-[10px] font-black uppercase tracking-tight text-[var(--team-text-muted)] transition-colors hover:text-[#458482]"
            style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {copy.manage}
          </button>
        </div>

        <div className="bg-[var(--team-bg)]">
          {dashboardMembers.map((member, index) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              index={index}
              isLast={index === dashboardMembers.length - 1}
              isRTL={isRTL}
              lang={lang}
              activeTasksLabel={copy.activeTasks(member.tasks)}
              isCurrentUser={member.userId === CURRENT_USER_ID}
            />
          ))}
        </div>

        <div className="flex justify-center p-4 bg-[var(--team-footer-bg)] border-t border-[var(--team-divider)]">
          <button
            type="button"
            onClick={(e) => {
              stopPropagation(e);
              openModal();
            }}
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

      {isModalOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <m.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={CARD_TRANSITION}
            dir={isRTL ? 'rtl' : 'ltr'}
            role="dialog"
            aria-modal="true"
            aria-labelledby="all-members-title"
            onClick={stopPropagation}
            className="w-full max-w-xl max-h-[85vh] overflow-hidden rounded-2xl flex flex-col"
            style={palette}
          >
            <div className="shrink-0 flex items-center justify-between gap-4 p-5 sm:p-6 bg-[var(--team-header-bg)] border-b border-[var(--team-divider)]">
              <h3
                id="all-members-title"
                className="text-sm font-bold uppercase tracking-widest text-[var(--team-text-main)]"
                style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
              >
                {copy.allMembersTitle}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label={copy.close}
                className="shrink-0 cursor-pointer rounded-lg p-1.5 text-[var(--team-text-muted)] transition-colors hover:text-[#458482]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-[var(--team-bg)]">
              {allMembersSorted.map((member, index) => (
                <TeamMemberRow
                  key={member.id}
                  member={member}
                  index={index}
                  isLast={index === allMembersSorted.length - 1}
                  isRTL={isRTL}
                  lang={lang}
                  activeTasksLabel={copy.activeTasks(member.tasks)}
                  isCurrentUser={member.userId === CURRENT_USER_ID}
                />
              ))}
            </div>
          </m.div>
        </m.div>
      )}
    </LazyMotion>
  );
}

export default memo(TeamProgress);