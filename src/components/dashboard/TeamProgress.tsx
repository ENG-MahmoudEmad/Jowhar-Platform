"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Users } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

const teamMembers = [
  { id: 1, name: 'Ahmed',  role: 'Lead Animator',  roleAr: 'محرك رئيسي',   progress: 85, color: '#458482', tasks: 12 },
  { id: 2, name: 'Sarah',  role: '3D Modeler',      roleAr: 'مصممة ثلاثية', progress: 65, color: '#f59e0b', tasks: 8  },
  { id: 3, name: 'Omar',   role: 'VFX Artist',      roleAr: 'فنان مؤثرات',  progress: 40, color: '#ef4444', tasks: 4  },
  { id: 4, name: 'Lina',   role: 'Concept Artist',  roleAr: 'فنانة مفاهيم', progress: 92, color: '#458482', tasks: 15 },
];

export default function TeamProgress() {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';

  /* ── palette ── */
  const bg        = isDark ? 'var(--card)'           : '#ffffff';
  const border    = isDark ? 'var(--card-border)'    : 'rgba(0,0,0,0.07)';
  const headerBg  = isDark ? 'var(--background-alt)' : '#f5f5ef';
  const divider   = isDark ? 'var(--divider)'        : 'rgba(0,0,0,0.06)';
  const trackBg   = isDark ? 'rgba(255,255,255,0.05)': 'rgba(0,0,0,0.06)';
  const avatarBg  = isDark ? 'var(--background)'     : '#e8e8e1';
  const textMain  = 'var(--foreground)';
  const textMuted = 'var(--foreground-muted)';
  const footerBg  = isDark ? 'rgba(13,17,23,0.5)'   : 'rgba(249,249,243,0.8)';

  /* ── translations ── */
  const tx = {
    title:       lang === 'ar' ? 'أداء الفريق'            : 'Team Performance',
    subtitle:    lang === 'ar' ? 'توزيع العمل على الفنانين' : 'Workload distribution per artist',
    manage:      lang === 'ar' ? 'إدارة الفريق'            : 'Manage Team',
    activeTasks: (n: number) => lang === 'ar' ? `${n} مهمة نشطة` : `${n} Active Tasks`,
    report:      lang === 'ar' ? 'عرض التقرير الكامل'      : 'View full report',
  };

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background:       bg,
        border:           `1px solid ${border}`,
        userSelect:       'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* ─── Header ─── */}
      <div
        className="p-5 sm:p-6 flex items-center justify-between"
        style={{
          background:    headerBg,
          borderBottom:  `1px solid ${divider}`,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }}
      >
        <div
          className="flex items-center gap-3"
          style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
        >
          <div className="p-2 rounded-lg shrink-0"
            style={{ background: 'rgba(69,132,130,0.1)' }}>
            <Users size={18} className="text-[#458482]" />
          </div>
          <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
            <h2
              className="text-sm font-bold uppercase tracking-widest"
              style={{
                color:      textMain,
                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              }}
            >
              {tx.title}
            </h2>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: textMuted }}>
              {tx.subtitle}
            </p>
          </div>
        </div>

        <button
          className="text-[10px] font-black uppercase tracking-tight transition-colors shrink-0 cursor-pointer"
          style={{
            color:      textMuted,
            fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#458482'}
          onMouseLeave={e => e.currentTarget.style.color = textMuted}
        >
          {tx.manage}
        </button>
      </div>

      {/* ─── Member rows ─── */}
      <div style={{ background: bg }}>
        {teamMembers.map((member, index) => (
          <motion.div
            key={member.id}
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="p-4 sm:p-5 transition-colors"
            style={{
              borderBottom: index < teamMembers.length - 1 ? `1px solid ${divider}` : 'none',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
          >
            <div className="flex flex-col gap-3">

              {/* ── Top row: avatar+name ←→ stats ── */}
              <div
                className="flex items-center justify-between"
                style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
              >
                {/* Avatar + name (always English) + role */}
                <div
                  className="flex items-center gap-3 min-w-0"
                  style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors"
                    style={{
                      background: avatarBg,
                      border:     `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
                      color:      '#458482',
                    }}
                  >
                    {member.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div
                    className="min-w-0"
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  >
                    {/* Name: always English */}
                    <h4 className="text-sm font-bold truncate" style={{ color: textMain }}>
                      {member.name}
                    </h4>
                    {/* Role: translates */}
                    <p
                      className="text-[10px] font-medium uppercase tracking-wider"
                      style={{
                        color:      textMuted,
                        fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                        textTransform: lang === 'ar' ? 'none' : 'uppercase',
                      }}
                    >
                      {lang === 'ar' ? member.roleAr : member.role}
                    </p>
                  </div>
                </div>

                {/* Stats: percentage + task count — flips side in RTL */}
                <div style={{ textAlign: isRTL ? 'left' : 'right', flexShrink: 0 }}>
                  <span
                    className="text-xs font-mono font-bold"
                    style={{ color: textMain }}
                  >
                    {member.progress}%
                  </span>
                  <p
                    className="text-[9px] font-black tracking-tight"
                    style={{
                      color:      textMuted,
                      fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                      textTransform: lang === 'ar' ? 'none' : 'uppercase',
                    }}
                  >
                    {tx.activeTasks(member.tasks)}
                  </p>
                </div>
              </div>

              {/* ── Progress bar — fills from the correct side ── */}
              <div
                className="relative w-full rounded-full overflow-hidden"
                style={{
                  height:     '6px',
                  background: trackBg,
                  border:     `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  direction:  isRTL ? 'rtl' : 'ltr', /* bar grows from reading-start */
                }}
              >
                <motion.div
                  initial={false}
                  animate={{ width: `${member.progress}%` }}
                  transition={{ delay: index * 0.08 + 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    /* in RTL the bar grows from right; in LTR from left */
                    [isRTL ? 'right' : 'left']: 0,
                    background: member.color,
                  }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── Footer ─── */}
      <div
        className="p-4 flex justify-center"
        style={{ background: footerBg, borderTop: `1px solid ${divider}` }}
      >
        <button
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#458482] transition-all cursor-pointer hover:gap-3"
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            textTransform: lang === 'ar' ? 'none' : 'uppercase',
          }}
        >
          {tx.report}
          <ChevronRight
            size={13}
            style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}
          />
        </button>
      </div>
    </div>
  );
}
