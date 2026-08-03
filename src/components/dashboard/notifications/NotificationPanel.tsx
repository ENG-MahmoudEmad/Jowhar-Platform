// src/components/dashboard/notifications/NotificationPanel.tsx
"use client";

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LazyMotion, domMax, m, AnimatePresence } from 'framer-motion';
import { CheckCheck, X, BellOff } from 'lucide-react';
import { useLang } from '@/context/LangContext';
import { groupNotifications, type AppNotification, type NotificationGroup } from '@/lib/notifications';
import NotificationItem from './NotificationItem';

const PANEL_WIDTH = 380;

function NotificationPanel({
  open,
  notifications,
  loading,
  isDark,
  onClose,
  onSelect,
  onMarkAllRead,
  onViewAll,
}: {
  open: boolean;
  notifications: AppNotification[];
  loading?: boolean;
  isDark: boolean;
  onClose: () => void;
  onSelect: (n: AppNotification) => void;
  onMarkAllRead: () => void;
  onViewAll: () => void;
}) {
  const { lang, isRTL } = useLang();
  const arabicFont = lang === 'ar' ? 'var(--font-arabic)' : 'inherit';

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /*
    ⚠️ الـ Portal مش تحسين — هو الإصلاح.

    الـ Navbar فيه `backdrop-filter: blur(20px)`، وأي عنصر فيه backdrop-filter
    بيصير containing block لأي `position: fixed` جوّاه. يعني طبقة الإغلاق
    `fixed inset-0` كانت بتغطي **الهيدر فقط** مش الشاشة — فالضغط على
    الناف بار بيسكّر واللي غيره لأ.

    الـ Portal بيطلّع الطبقة لـ `document.body`، برّا شجرة الهيدر تمامًا.
  */
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  /* Escape بتسكّر — متطلب وصولية أساسي لأي طبقة عائمة */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /*
    الوقت النسبي بيتحدّث لحاله: "منذ دقيقة" بتصير "منذ 5 دقائق" بدون
    ما المستخدم يعمل شي. بيشتغل بس واللوحة مفتوحة.
  */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [open]);

  const groups = useMemo(
    () => groupNotifications(notifications),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notifications, tick]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const tx = {
    title:    lang === 'ar' ? 'الإشعارات'         : 'Notifications',
    markAll:  lang === 'ar' ? 'تعليم الكل كمقروء' : 'Mark all as read',
    viewAll:  lang === 'ar' ? 'عرض الكل'          : 'View all',
    empty:    lang === 'ar' ? 'لا توجد إشعارات'   : 'No notifications',
    emptySub: lang === 'ar' ? 'كل شيء محدّث'      : 'You are all caught up',
    loading:  lang === 'ar' ? 'جارٍ التحميل'      : 'Loading...',
    close:    lang === 'ar' ? 'إغلاق'             : 'Close',
  };

  const groupLabel = useCallback((g: NotificationGroup) => {
    if (g === 'today') return lang === 'ar' ? 'اليوم' : 'Today';
    if (g === 'week')  return lang === 'ar' ? 'هذا الأسبوع' : 'This week';
    return lang === 'ar' ? 'أقدم' : 'Earlier';
  }, [lang]);

  const surface = isDark ? '#12151a' : '#ffffff';
  const headerBg = isDark ? 'var(--background-alt)' : '#f5f5ef';

  const body = (
    <>
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between gap-2 px-4 py-3"
        style={{ background: headerBg, borderBottom: '1px solid var(--divider)' }}
      >
        <h3
          className="text-[12px] font-black uppercase tracking-widest"
          style={{ color: 'var(--foreground)', fontFamily: arabicFont }}
        >
          {tx.title}
        </h3>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-colors"
              style={{ color: '#458482', fontFamily: arabicFont }}
            >
              <CheckCheck className="h-3 w-3" />
              {tx.markAll}
            </button>
          )}
          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              aria-label={tx.close}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg"
              style={{ color: 'var(--foreground-muted)' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div
        className="flex-1 overflow-y-auto custom-scrollbar"
        style={{ maxHeight: isMobile ? '70vh' : 420 }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <span className="text-[12px] font-medium" style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}>
              {tx.loading}
            </span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <BellOff className="h-6 w-6" style={{ color: 'var(--foreground-muted)', opacity: 0.5 }} />
            <span className="text-[12px] font-bold" style={{ color: 'var(--foreground)', fontFamily: arabicFont }}>
              {tx.empty}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}>
              {tx.emptySub}
            </span>
          </div>
        ) : (
          groups.map(({ group, items }) => (
            <div key={group}>
              <div
                className="sticky top-0 z-10 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest backdrop-blur"
                style={{
                  color: 'var(--foreground-muted)',
                  background: isDark ? 'rgba(18,21,26,0.92)' : 'rgba(255,255,255,0.92)',
                  fontFamily: arabicFont,
                }}
              >
                {groupLabel(group)}
              </div>
              {items.map((n) => (
                <NotificationItem key={n.id} notification={n} isDark={isDark} onSelect={onSelect} />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <button
          type="button"
          onClick={onViewAll}
          className="shrink-0 cursor-pointer py-2.5 text-center text-[11px] font-bold transition-colors"
          style={{
            color: '#458482',
            borderTop: '1px solid var(--divider)',
            fontFamily: arabicFont,
          }}
        >
          {tx.viewAll}
        </button>
      )}
    </>
  );

  if (!mounted) return null;

  return createPortal(
    <LazyMotion features={domMax}>
      <AnimatePresence>
        {open && (
          <>
            {/*
              طبقة الإغلاق بالضغط برّا. شفافة على الديسكتوب، ومعتمة على
              الجوال لأن الـ bottom sheet بيغطي نص الشاشة.
            */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[60]"
              style={{
                background: isMobile ? 'rgba(0,0,0,0.45)' : 'transparent',
                backdropFilter: isMobile ? 'blur(4px)' : undefined,
              }}
            />

            {isMobile ? (
              /* Bottom sheet — نفس نمط MyNotes على الجوال */
              <m.div
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 32, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.4 }}
                onDragEnd={(_e, info) => { if (info.offset.y > 100) onClose(); }}
                dir={isRTL ? 'rtl' : 'ltr'}
                className="fixed bottom-0 left-0 right-0 z-[70] flex flex-col overflow-hidden rounded-t-3xl"
                style={{ background: surface, borderTop: '1px solid var(--card-border)', maxHeight: '85vh' }}
              >
                <div className="flex justify-center pt-3 pb-1" style={{ cursor: 'grab', touchAction: 'none' }}>
                  <div className="h-1 w-10 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
                </div>
                {body}
              </m.div>
            ) : (
              /*
                بعد الـ Portal صارت اللوحة برّا الجرس، فما عادت تقدر تتموضع
                نسبةً إله بـ `absolute`. الحل: `fixed` بمسافة ثابتة من أعلى
                الشاشة ومن الحافة — نفس مكانها البصري بالضبط، بس بلا اعتماد
                على شجرة الهيدر.
              */
              <m.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                role="dialog"
                aria-label={tx.title}
                dir={isRTL ? 'rtl' : 'ltr'}
                className="fixed z-[70] flex flex-col overflow-hidden rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.32)]"
                style={{
                  width: PANEL_WIDTH,
                  maxWidth: 'calc(100vw - 2rem)',
                  top: 'calc(4rem + 8px)',
                  [isRTL ? 'left' : 'right']: '1rem',
                  background: surface,
                  border: '1px solid var(--card-border)',
                }}
              >
                {body}
              </m.div>
            )}
          </>
        )}
      </AnimatePresence>
    </LazyMotion>,
    document.body
  );
}

export default memo(NotificationPanel);