"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Users } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

const teamMembers = [
  { id: 1, nameEn: 'Ahmed', nameAr: 'أحمد', roleEn: 'Lead Animator',   roleAr: 'محرك رئيسي',   progress: 85, color: '#458482', tasks: 12 },
  { id: 2, nameEn: 'Sarah', nameAr: 'سارة', roleEn: '3D Modeler',      roleAr: 'مصممة ثلاثية',  progress: 65, color: '#f59e0b', tasks: 8  },
  { id: 3, nameEn: 'Omar',  nameAr: 'عمر',  roleEn: 'VFX Artist',      roleAr: 'فنان مؤثرات',   progress: 40, color: '#ef4444', tasks: 4  },
  { id: 4, nameEn: 'Lina',  nameAr: 'لينا', roleEn: 'Concept Artist',  roleAr: 'فنانة مفاهيم',  progress: 92, color: '#458482', tasks: 15 },
];

const t = {
  en: {
    title:       'Team Performance',
    subtitle:    'Workload distribution per artist',
    manage:      'Manage Team',
    activeTasks: (n: number) => `${n} Active Tasks`,
    report:      'View full report',
  },
  ar: {
    title:       'أداء الفريق',
    subtitle:    'توزيع العمل على الفنانين',
    manage:      'إدارة الفريق',
    activeTasks: (n: number) => `${n} مهمة نشطة`,
    report:      'عرض التقرير الكامل',
  },
};

export default function TeamProgress() {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();

  const isDark = theme === 'dark';
  const tx = t[lang];

  const cardBg     = isDark ? 'var(--card)'         : '#ffffff';
  const cardBorder = isDark ? 'var(--card-border)'  : 'rgba(0,0,0,0.07)';
  const headerBg   = isDark ? 'var(--background-alt)' : '#f5f5ef';
  const dividerC   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const trackBg    = isDark ? 'var(--background)'   : '#ebebE3';
  const avatarBg   = isDark ? 'var(--background)'   : '#e8e8e1';
  const avatarBorder = isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.08)';
  const textMain   = 'var(--foreground)';
  const textMuted  = 'var(--foreground-muted)';
  const footerBg   = isDark ? 'rgba(13,17,23,0.5)'  : 'rgba(249,249,243,0.8)';

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
    >
      {/* ─── Header ─── */}
      <div
        className={`p-5 sm:p-6 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}
        style={{ background: headerBg, borderBottom: `1px solid ${dividerC}` }}
      >
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="p-2 rounded-lg" style={{ background: 'rgba(69,132,130,0.1)' }}>
            <Users size={18} className="text-[#458482]" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: textMain, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {tx.title}
            </h2>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: textMuted }}>
              {tx.subtitle}
            </p>
          </div>
        </div>

        <button
          className="text-[10px] font-black uppercase tracking-tight transition-colors"
          style={{ color: textMuted, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.color = '#458482'}
          onMouseLeave={e => e.currentTarget.style.color = textMuted}
        >
          {tx.manage}
        </button>
      </div>

      {/* ─── Member list ─── */}
      <div style={{ background: cardBg }}>
        {teamMembers.map((member, index) => {
          const name = lang === 'ar' ? member.nameAr : member.nameEn;
          const role = lang === 'ar' ? member.roleAr : member.roleEn;

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="p-4 sm:p-5 group transition-colors"
              style={{ borderBottom: index < teamMembers.length - 1 ? `1px solid ${dividerC}` : 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              <div className="flex flex-col gap-3">

                {/* Top row */}
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>

                  {/* Avatar + info */}
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors"
                      style={{
                        background:   avatarBg,
                        border:       `1px solid ${avatarBorder}`,
                        color:        '#458482',
                      }}
                    >
                      {name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <h4
                        className="text-sm font-bold"
                        style={{ color: textMain, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                      >
                        {name}
                      </h4>
                      <p
                        className="text-[10px] font-medium uppercase tracking-wider"
                        style={{ color: textMuted }}
                      >
                        {role}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className={isRTL ? 'text-left' : 'text-right'}>
                    <span className="text-xs font-mono font-bold" style={{ color: textMain }}>
                      {member.progress}%
                    </span>
                    <p className="text-[9px] uppercase font-black tracking-tight" style={{ color: textMuted }}>
                      {tx.activeTasks(member.tasks)}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  className="relative w-full h-1.5 rounded-full overflow-hidden"
                  style={{ background: trackBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${member.progress}%` }}
                    transition={{ delay: index * 0.08 + 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className={`absolute top-0 h-full rounded-full ${isRTL ? 'right-0' : 'left-0'}`}
                    style={{ backgroundColor: member.color }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Footer ─── */}
      <div
        className={`p-4 flex justify-center`}
        style={{ background: footerBg, borderTop: `1px solid ${dividerC}` }}
      >
        <button
          className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest
            text-[#458482] transition-all hover:gap-3
            ${isRTL ? 'flex-row-reverse' : ''}`}
          style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
        >
          {tx.report}
          <ChevronRight size={13} className={isRTL ? 'rotate-180' : ''} />
        </button>
      </div>
    </div>
  );
}