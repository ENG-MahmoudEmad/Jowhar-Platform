"use client";

import React, { memo, useMemo, useState, useCallback } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { ChevronRight, Users, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { useCurrentUser } from '@/context/UserContext';
import Avatar from '@/components/ui/Avatar';
import { sortMembersForDisplay } from '@/lib/sortMembersForDisplay';

// نبضة النقطة الخضرا (أونلاين) — نفس فلسفة نقطة الفوتر، بس دورة أسرع شوية
// عشان تحس إنها "حية" بجانب الاسم بدون ما تكون مزعجة.
const ONLINE_DOT_ANIMATE = { opacity: [1, 0.35, 1], scale: [1, 0.7, 1] };
const ONLINE_DOT_TRANSITION = { duration: 1.8, repeat: Infinity, ease: 'easeInOut' as const };

// ─────────────────────────────────────────────────────────────────────────────
// Data shape — matches what the server (page.tsx) hands down after mapping
// the raw `get_team_progress()` RPC row. This component knows nothing about
// Supabase, column names, or how the percentage was computed.
// ─────────────────────────────────────────────────────────────────────────────
export type TeamMemberData = {
  id: string; // profiles.id (uuid) — also the auth user id, no separate userId anymore
  name: string;
  initials: string;
  role: string;
  roleAr: string;
  color: string;
  avatarUrl: string | null;
  progress: number; // 0-100, computed server-side
  tasksCount: number; // active (open) tasks, computed server-side
};

type Lang = 'en' | 'ar';
type TeamProgressStyle = React.CSSProperties & Record<`--team-${string}`, string>;
type MemberRowStyle = React.CSSProperties & Record<'--member-color', string>;

interface TeamProgressProps {
  members: TeamMemberData[];
  currentUserId: string;
}

const DASHBOARD_MEMBER_LIMIT = 5; // current user + 4 others

// Progress bar color thresholds: 0–40% red, 40–70% yellow, 70%+ teal.
// ⚠️ Keep in sync with the server-side thresholds if this ever moves there —
// right now the RPC only returns the raw percentage, coloring stays client-side.
const PROGRESS_COLOR_LOW = '#ef4444';
const PROGRESS_COLOR_MID = '#f59e0b';
const PROGRESS_COLOR_HIGH = '#458482';

function getProgressColor(progress: number): string {
  if (progress < 40) return PROGRESS_COLOR_LOW;
  if (progress < 70) return PROGRESS_COLOR_MID;
  return PROGRESS_COLOR_HIGH;
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
    empty: 'No team members to show yet',
  },
  ar: {
    title: 'أداء الفريق',
    subtitle: 'توزيع العمل على الفنانين',
    manage: 'إدارة الفريق',
    report: 'عرض التقرير الكامل',
    activeTasks: (count: number) => `${count} مهمة نشطة`,
    allMembersTitle: 'كل أعضاء الفريق',
    close: 'إغلاق',
    empty: 'لا يوجد أعضاء لعرضهم بعد',
  },
} satisfies Record<Lang, {
  title: string;
  subtitle: string;
  manage: string;
  report: string;
  activeTasks: (count: number) => string;
  allMembersTitle: string;
  close: string;
  empty: string;
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
  isOnline,
}: {
  member: TeamMemberData;
  index: number;
  isLast: boolean;
  isRTL: boolean;
  lang: Lang;
  activeTasksLabel: string;
  isOnline?: boolean;
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
            <Avatar
              avatarUrl={member.avatarUrl}
              initials={member.initials}
              name={member.name}
              size={36}
              shape="square"
              className="text-xs font-bold text-[#458482] transition-colors bg-[var(--team-avatar-bg)] border border-[var(--team-avatar-border)]"
            />

            <div className="min-w-0 text-start">
              {/* h3 لأن الأب هو h2 (team-progress-title) — كنا نستخدم h4 هنا وده كان بيقفز فوق h3 */}
              <h3 className="truncate text-sm font-bold text-[var(--team-text-main)] flex items-center gap-1.5">
                {member.name}
                {isOnline && (
                  <m.span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                    style={{ boxShadow: '0 0 5px rgba(52,211,153,0.7)' }}
                    animate={ONLINE_DOT_ANIMATE}
                    transition={ONLINE_DOT_TRANSITION}
                    aria-label={lang === 'ar' ? 'متصل الآن' : 'Online now'}
                  />
                )}
              </h3>
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

function TeamProgress({ members, currentUserId }: TeamProgressProps) {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();
  const { isOnline } = useCurrentUser();
  const isDark = theme === 'dark';
  const copy = TEXT[lang];
  const palette = useMemo(() => getPalette(isDark), [isDark]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const dashboardMembers = useMemo(
    () => sortMembersForDisplay(members, currentUserId, DASHBOARD_MEMBER_LIMIT),
    [members, currentUserId]
  );

  const allMembersSorted = useMemo(
    () => sortMembersForDisplay(members, currentUserId),
    [members, currentUserId]
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

          {/*
            target-size fix: كان الزرار 76×15px بس (النص نفسه بدون padding كافي).
            المفروض على الأقل 24×24px. min-h-6 + padding بيوسّع منطقة اللمس
            من غير ما يكبر شكل النص بصريًا بشكل ملحوظ.
          */}
          <button
            type="button"
            onClick={stopPropagation}
            className="shrink-0 cursor-pointer min-h-6 px-2 py-1.5 -m-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight text-[var(--team-text-muted)] transition-colors hover:text-[#458482]"
            style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          >
            {copy.manage}
          </button>
        </div>

        <div className="bg-[var(--team-bg)]">
          {dashboardMembers.length === 0 ? (
            <p
              className="p-6 text-center text-xs font-medium text-[var(--team-text-muted)]"
              style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {copy.empty}
            </p>
          ) : (
            dashboardMembers.map((member, index) => (
              <TeamMemberRow
                key={member.id}
                member={member}
                index={index}
                isLast={index === dashboardMembers.length - 1}
                isRTL={isRTL}
                lang={lang}
                activeTasksLabel={copy.activeTasks(member.tasksCount)}
                isOnline={isOnline(member.id)}
              />
            ))
          )}
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

      <AnimatePresence>
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
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
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
                {allMembersSorted.length === 0 ? (
                  <p
                    className="p-6 text-center text-xs font-medium text-[var(--team-text-muted)]"
                    style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                  >
                    {copy.empty}
                  </p>
                ) : (
                  allMembersSorted.map((member, index) => (
                    <TeamMemberRow
                      key={member.id}
                      member={member}
                      index={index}
                      isLast={index === allMembersSorted.length - 1}
                      isRTL={isRTL}
                      lang={lang}
                      activeTasksLabel={copy.activeTasks(member.tasksCount)}
                      isOnline={isOnline(member.id)}
                    />
                  ))
                )}
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}

export default memo(TeamProgress);