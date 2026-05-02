"use client"

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

type View = 'weekly' | 'monthly' | 'mytasks';

interface Member {
  id:     number;
  name:   string;
  nameAr: string;
  avatar: string;
  color:  string;
}

interface Task {
  id:       number;
  memberId: number;
  title:    string;
  titleAr:  string;
  start:    Date;
  end:      Date;
  color:    string;
}

const MEMBERS: Member[] = [
  { id: 1, name: 'Ahmed',    nameAr: 'أحمد',   avatar: 'AH', color: '#458482' },
  { id: 2, name: 'Sarah',    nameAr: 'سارة',   avatar: 'SA', color: '#f59e0b' },
  { id: 3, name: 'Tweeflue', nameAr: 'تويفلو', avatar: 'TW', color: '#a855f7' },
  { id: 4, name: 'Omar',     nameAr: 'عمر',    avatar: 'OM', color: '#ef4444' },
  { id: 5, name: 'Lina',     nameAr: 'لينا',   avatar: 'LI', color: '#3b82f6' },
];

const MY_MEMBER_ID = 1;

const d = (offset: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt;
};

const ALL_TASKS: Task[] = [
  { id: 1,  memberId: 1, title: 'Character Rigging', titleAr: 'تحريك الشخصية',  start: d(-3), end: d(2),  color: '#458482' },
  { id: 2,  memberId: 1, title: 'Walk Cycle',         titleAr: 'دورة المشي',      start: d(3),  end: d(7),  color: '#5ea8a4' },
  { id: 3,  memberId: 2, title: '3D Environment',     titleAr: 'بيئة ثلاثية',     start: d(-1), end: d(4),  color: '#f59e0b' },
  { id: 4,  memberId: 2, title: 'Texture Mapping',    titleAr: 'خرائط النسيج',    start: d(5),  end: d(10), color: '#f97316' },
  { id: 5,  memberId: 3, title: 'Particle Effects',   titleAr: 'تأثيرات الجسيمات', start: d(-2), end: d(6),  color: '#a855f7' },
  { id: 6,  memberId: 4, title: 'Motion Blur VFX',    titleAr: 'تأثير التمويه',   start: d(0),  end: d(3),  color: '#ef4444' },
  { id: 7,  memberId: 4, title: 'Color Grading',      titleAr: 'تصحيح الألوان',   start: d(4),  end: d(8),  color: '#f43f5e' },
  { id: 8,  memberId: 5, title: 'Concept Sketches',   titleAr: 'رسومات أولية',    start: d(-4), end: d(1),  color: '#3b82f6' },
  { id: 9,  memberId: 5, title: 'Storyboard',         titleAr: 'القصة المصوّرة',   start: d(2),  end: d(9),  color: '#6366f1' },
];

/* ─── Date helpers ─── */
function getWeekDays(anchor: Date): Date[] {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    return dt;
  });
}

function getMonthDays(anchor: Date): Date[] {
  const year  = anchor.getFullYear();
  const month = anchor.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1));
}

function fmt(date: Date, lang: string) {
  return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short' });
}
function fmtMonth(date: Date, lang: string) {
  return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' });
}

export default function ProjectCalendar() {
  const { theme }       = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';

  const [view,   setView]   = useState<View>('weekly');
  const [anchor, setAnchor] = useState(new Date());

  const bg       = isDark ? 'var(--card)'           : '#ffffff';
  const border   = isDark ? 'var(--card-border)'    : 'rgba(0,0,0,0.07)';
  const headerBg = isDark ? 'var(--background-alt)' : '#f5f5ef';
  const divider  = isDark ? 'var(--divider)'        : 'rgba(0,0,0,0.06)';
  const textMain = 'var(--foreground)';
  const textMuted= 'var(--foreground-muted)';
  const trackBg  = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const todayClr = '#458482';

  const days = useMemo(() => {
    if (view === 'monthly') return getMonthDays(anchor);
    return getWeekDays(anchor);
  }, [view, anchor]);

  const members = view === 'mytasks'
    ? MEMBERS.filter(m => m.id === MY_MEMBER_ID)
    : MEMBERS;

  const tasks = view === 'mytasks'
    ? ALL_TASKS.filter(t => t.memberId === MY_MEMBER_ID)
    : ALL_TASKS;

  const navigate = (dir: 1 | -1) => {
    const next = new Date(anchor);
    if (view === 'monthly') next.setMonth(anchor.getMonth() + dir);
    else                    next.setDate(anchor.getDate() + 7 * dir);
    setAnchor(next);
  };

  const getBarStyle = (task: Task) => {
    const totalDays  = days.length;
    const rangeStart = days[0];
    const rangeEnd   = days[totalDays - 1];
    if (task.end < rangeStart || task.start > rangeEnd) return null;

    const taskStart = task.start < rangeStart ? rangeStart : task.start;
    const taskEnd   = task.end   > rangeEnd   ? rangeEnd   : task.end;

    const startIdx = days.findIndex(d => d.toDateString() === taskStart.toDateString());
    const endIdx   = days.findIndex(d => d.toDateString() === taskEnd.toDateString());
    const s = startIdx < 0 ? 0 : startIdx;
    const e = endIdx   < 0 ? totalDays - 1 : endIdx;

    const leftPct  = (s / totalDays) * 100;
    const widthPct = Math.max(4, ((e - s + 1) / totalDays) * 100);

    if (isRTL) {
      return { right: `${leftPct}%`, width: `${widthPct}%` };
    }
    return { left: `${leftPct}%`, width: `${widthPct}%` };
  };

  const todayIdx = days.findIndex(d => d.toDateString() === new Date().toDateString());
  const todayPct = todayIdx >= 0 ? ((todayIdx + 0.5) / days.length) * 100 : null;

  const labelStep = view === 'monthly' ? Math.ceil(days.length / 7) : 1;
  const labelDays = days.filter((_, i) => i % labelStep === 0);

  const tx = {
    title:   lang === 'ar' ? 'التقويم' : 'Calendar',
    weekly:  lang === 'ar' ? 'أسبوعي'  : 'Weekly',
    monthly: lang === 'ar' ? 'شهري'    : 'Monthly',
    mytasks: lang === 'ar' ? 'مهامي'   : 'My Tasks',
  };

  const views: { key: View; label: string }[] = [
    { key: 'weekly',  label: tx.weekly  },
    { key: 'monthly', label: tx.monthly },
    { key: 'mytasks', label: tx.mytasks },
  ];

  /* Member col width */
  const memberColW = view === 'mytasks' ? 'w-32 sm:w-40' : 'w-24 sm:w-32';

  return (
    <div className="w-full rounded-2xl overflow-hidden"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}>

      {/* ─── Header ─── */}
      <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-3"
        style={{
          background: headerBg,
          borderBottom: `1px solid ${divider}`,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }}>

        {/* Title + nav */}
        <div className="flex items-center gap-2"
          style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <h2 className="text-sm font-bold uppercase tracking-widest"
            style={{ color: textMain, fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
            {tx.title}
          </h2>
          <span className="text-[11px] font-semibold" style={{ color: textMuted }}>
            {fmtMonth(anchor, lang)}
          </span>
          <div className="flex items-center gap-0.5">
            {[{ dir: -1 as const, icon: isRTL ? ChevronRight : ChevronLeft },
              { dir:  1 as const, icon: isRTL ? ChevronLeft  : ChevronRight }].map(({ dir, icon: Icon }, i) => (
              <button key={i} onClick={() => navigate(dir)}
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                style={{ color: textMuted }}
                onMouseEnter={e => { e.currentTarget.style.color = textMain; e.currentTarget.style.background = 'var(--hover-bg)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = textMuted; e.currentTarget.style.background = 'transparent'; }}>
                <Icon className="w-3.5 h-3.5"/>
              </button>
            ))}
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }}>
          {views.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
              style={{
                background: view === v.key ? '#458482' : 'transparent',
                color:      view === v.key ? '#ffffff'  : textMuted,
                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Gantt body ─── */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: view === 'monthly' ? '600px' : 'auto' }}>

          {/* Date label row */}
          <div className="flex" style={{ borderBottom: `1px solid ${divider}` }}>
            <div className={`shrink-0 ${memberColW}`}
              style={{
                borderRight: isRTL ? 'none' : `1px solid ${divider}`,
                borderLeft:  isRTL ? `1px solid ${divider}` : 'none',
              }}/>
            <div className="flex-1 flex">
              {labelDays.map((day, i) => (
                <div key={i} className="flex-1 text-center py-2"
                  style={{
                    fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em',
                    color: day.toDateString() === new Date().toDateString() ? todayClr : textMuted,
                  }}>
                  {fmt(day, lang)}
                </div>
              ))}
            </div>
          </div>

          {/* Member rows */}
          <AnimatePresence mode="wait">
            <motion.div key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}>
              {members.map((member, mIdx) => {
                const memberTasks = tasks.filter(t => t.memberId === member.id);
                return (
                  <div key={member.id} className="flex items-center"
                    style={{
                      borderBottom: mIdx < members.length - 1 ? `1px solid ${divider}` : 'none',
                      minHeight: '52px',
                    }}>

                    {/* Member cell */}
                    <div className={`shrink-0 ${memberColW} px-3 py-3 flex items-center gap-2`}
                      style={{
                        borderRight: isRTL ? 'none' : `1px solid ${divider}`,
                        borderLeft:  isRTL ? `1px solid ${divider}` : 'none',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0"
                        style={{ background: member.color, boxShadow: `0 2px 8px ${member.color}40` }}>
                        {member.avatar}
                      </div>
                      {/* Name always English */}
                      <span className="text-[10px] font-bold truncate"
                        style={{ color: textMain, textAlign: isRTL ? 'right' : 'left' }}>
                        {member.name}
                      </span>
                    </div>

                    {/* Task bars */}
                    <div className="flex-1 relative py-3 px-1" style={{ height: '52px' }}>

                      {/* Today line */}
                      {todayPct !== null && (
                        <div className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
                          style={{
                            [isRTL ? 'right' : 'left']: `${todayPct}%`,
                            background: `${todayClr}60`,
                          }}/>
                      )}

                      {/* Track */}
                      <div className="absolute inset-x-1 rounded-full"
                        style={{ top: '50%', transform: 'translateY(-50%)', height: '6px', background: trackBg }}/>

                      {/* Bars */}
                      {memberTasks.map(task => {
                        const style = getBarStyle(task);
                        if (!style) return null;
                        return (
                          <motion.div key={task.id}
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: 1 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: mIdx * 0.05 }}
                            title={lang === 'ar' ? task.titleAr : task.title}
                            style={{
                              position:        'absolute',
                              top:             '50%',
                              transform:       'translateY(-50%)',
                              transformOrigin: isRTL ? 'right center' : 'left center',
                              ...style,
                              height:          '18px',
                              background:      task.color,
                              borderRadius:    '999px',
                              opacity:         0.85,
                              cursor:          'default',
                              boxShadow:       `0 2px 8px ${task.color}50`,
                            }}
                            whileHover={{ opacity: 1, scaleY: 1.15 }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {/* Footer dates */}
          <div className="flex" style={{ borderTop: `1px solid ${divider}` }}>
            <div className={`shrink-0 ${memberColW}`}
              style={{
                borderRight: isRTL ? 'none' : `1px solid ${divider}`,
                borderLeft:  isRTL ? `1px solid ${divider}` : 'none',
              }}/>
            <div className="flex-1 flex">
              {labelDays.map((day, i) => (
                <div key={i} className="flex-1 text-center py-1.5"
                  style={{
                    fontSize: '9px', fontWeight: 600, opacity: 0.6,
                    color: day.toDateString() === new Date().toDateString() ? todayClr : textMuted,
                  }}>
                  {view === 'monthly'
                    ? day.getDate()
                    : day.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' })
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}