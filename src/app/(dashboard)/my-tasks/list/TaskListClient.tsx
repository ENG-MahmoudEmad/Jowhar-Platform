// src/app/(dashboard)/my-tasks/list/TaskListClient.tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { ClipboardList } from 'lucide-react';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import type { Task, TaskPriority } from '@/lib/taskStats';

type StatusFilter = 'open' | 'pending_review' | 'done';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#458482',
  medium: '#e0a740',
  high: '#ef4444',
};

export default function TaskListClient({ initialTasks }: { initialTasks: Task[] }) {
  const { lang, isRTL } = useLang();
  const { theme } = useTheme();
  const router = useRouter();
  const isDark = theme === 'dark';
  const isArabic = lang === 'ar';
  const arabicFont = isArabic ? 'var(--font-arabic)' : 'inherit';

  const [filter, setFilter] = useState<StatusFilter>('open');
  const [tasks] = useState(initialTasks);

  /*
    نفس منطق NotificationsClient: تبديل التبويب فلترة محلية بس، صفر طلب
    شبكة — الداتا كلها عندنا أصلاً من listMyTasks() الأولية.
  */
  const visibleTasks = useMemo(
    () => tasks.filter((t) => t.status === filter),
    [tasks, filter],
  );

  const counts = useMemo(
    () => ({
      open: tasks.filter((t) => t.status === 'open').length,
      pending_review: tasks.filter((t) => t.status === 'pending_review').length,
      done: tasks.filter((t) => t.status === 'done').length,
    }),
    [tasks],
  );

  const tabs: { key: StatusFilter; labelAr: string; labelEn: string }[] = [
    { key: 'open', labelAr: 'مفتوحة', labelEn: 'Open' },
    { key: 'pending_review', labelAr: 'قيد المراجعة', labelEn: 'In Review' },
    { key: 'done', labelAr: 'منجزة', labelEn: 'Done' },
  ];

  const tx = {
    title: isArabic ? 'كل مهامي' : 'All My Tasks',
    subtitle: isArabic ? 'حسب الحالة' : 'By status',
    emptyOpen: isArabic ? 'لا مهام مفتوحة' : 'No open tasks',
    emptyReview: isArabic ? 'لا مهام قيد المراجعة' : 'No tasks in review',
    emptyDone: isArabic ? 'لا مهام منجزة' : 'No completed tasks',
  };

  const emptyLabel =
    filter === 'open' ? tx.emptyOpen : filter === 'pending_review' ? tx.emptyReview : tx.emptyDone;

  const bg = isDark ? 'var(--card)' : '#ffffff';
  const border = isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)';
  const divider = isDark ? 'var(--divider)' : 'rgba(0,0,0,0.06)';

  return (
    <LazyMotion features={domAnimation}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-4">
        <div>
          <h1
            className="text-lg font-black uppercase tracking-widest"
            style={{ color: 'var(--foreground)', fontFamily: arabicFont }}
          >
            {tx.title}
          </h1>
          <p
            className="mt-0.5 text-[12px] font-medium"
            style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}
          >
            {tx.subtitle}
          </p>
        </div>

        {/* تبويبات — نفس نمط All/Unread بالإشعارات بالضبط */}
        <div
          className="flex w-fit items-center gap-1 rounded-xl p-1"
          style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all"
              style={{
                background: filter === t.key ? '#458482' : 'transparent',
                color: filter === t.key ? '#ffffff' : 'var(--foreground-muted)',
                fontFamily: arabicFont,
              }}
            >
              {isArabic ? t.labelAr : t.labelEn} ({counts[t.key]})
            </button>
          ))}
        </div>

        <div className="w-full overflow-hidden rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
          {visibleTasks.length === 0 ? (
            <m.div
              key={`empty-${filter}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center gap-3 py-24"
            >
              <ClipboardList className="h-6 w-6" style={{ color: 'var(--foreground-muted)', opacity: 0.5 }} />
              <span className="text-[13px] font-bold" style={{ color: 'var(--foreground)', fontFamily: arabicFont }}>
                {emptyLabel}
              </span>
            </m.div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {/*
                ⚠️ مفتاح الحاوية = filter، مش task.id. القائمة كلها بتخرج
                كوحدة وحدة (crossfade) عند تبديل التبويب، بدل ما كل عنصر
                يحاول FLIP-animate موضعه القديم — هاي كانت سبب الحركة
                الغريبة (`layout` على عناصر id مختلف تمامًا كل تبويب، فما
                كان في "موضع قديم" حقيقي يتحرك منه، وFramer كان يخترع
                انتقال مش منطقي).
              */}
              <m.div
                key={filter}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {visibleTasks.map((task, i) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => router.push(`/my-tasks/${task.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-start cursor-pointer transition-colors hover:bg-[var(--hover-bg)]"
                    style={{ borderBottom: i === visibleTasks.length - 1 ? 'none' : `1px solid ${divider}` }}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ background: PRIORITY_COLORS[task.priority] }}
                    />
                    <span className="flex-1 min-w-0">
                      <span
                        className="block text-sm font-bold truncate"
                        style={{ color: 'var(--foreground)', fontFamily: arabicFont }}
                      >
                        {task.title}
                      </span>
                      {task.createdByName && (
                        <span
                          className="block text-[10px] font-medium truncate"
                          style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}
                        >
                          {isArabic ? 'أعطاها' : 'Assigned by'} {task.createdByName}
                        </span>
                      )}
                    </span>
                    {task.lastRejectionNote && !task.rejectionSeenAt && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black"
                        style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}
                      >
                        {isArabic ? 'مرفوضة' : 'Rejected'}
                      </span>
                    )}
                  </button>
                ))}
              </m.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}