// src/app/(dashboard)/notifications/NotificationsClient.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { CheckCheck, Loader2, Trash2, Bell } from 'lucide-react';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import { groupNotifications, type AppNotification, type NotificationGroup } from '@/lib/notifications';
import NotificationItem from '@/components/dashboard/notifications/NotificationItem';
import {
  listMyNotificationsPage,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../notificationsActions';

type Filter = 'all' | 'unread';

export default function NotificationsClient({
  initialItems,
  initialCursor,
  initialUnreadCount,
}: {
  initialItems: AppNotification[];
  initialCursor: string | null;
  initialUnreadCount: number;
}) {
  const { lang, isRTL } = useLang();
  const { theme } = useTheme();
  const router = useRouter();
  const isDark = theme === 'dark';
  const arabicFont = lang === 'ar' ? 'var(--font-arabic)' : 'inherit';

  const [filter, setFilter] = useState<Filter>('all');

  /*
    ⚠️ القرار المهم هون: `items` دايمًا القائمة **الكاملة** (all)، مش
    قائمة مفلترة من السيرفر. تبديل All/Unread بيصير بـ `.filter()` محلي
    على `useMemo` — صفر طلب شبكة، صفر انتظار، صفر رندرة محسوسة.

    ليش هذا صح مش بس أسرع: "غير مقروءة" مش سؤال جديد للسيرفر، هي
    مشتقة من بيانات عندنا أصلاً (`isRead` بكل عنصر). الرحلة للسيرفر
    كانت لشي ما بيحتاجها إطلاقًا — نفس فخ إعادة جلب شي موجود بالحالة
    (درس #17 بملف الحالة).

    Trade-off واحد نقبله: لو في إشعارات غير مقروءة أقدم من آخر صفحة
    محمّلة، ما بتظهر لحد ما تحمّل المزيد. مقبول لأن غير المقروء غالبًا
    حديث، وزر "تحميل المزيد" بيكمّل باقي التاريخ عند الحاجة.
  */
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loadingMore, setLoadingMore] = useState(false);

  const visibleItems = useMemo(
    () => (filter === 'unread' ? items.filter((n) => !n.isRead) : items),
    [items, filter]
  );

  const handleFilterChange = useCallback((f: Filter) => {
    setFilter(f); // تبديل فوري — بلا أي جلب
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { items: rows, nextCursor } = await listMyNotificationsPage({ cursor });
      setItems((prev) => [...prev, ...rows]);
      setCursor(nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  /* فتح إشعار = تعليمه مقروء + التنقل — نفس سلوك لوحة الجرس بالضبط */
  const handleSelect = useCallback((n: AppNotification) => {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      void markNotificationRead(n.id).catch(() => {
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: false } : x)));
        setUnreadCount((c) => c + 1);
      });
    }
    router.push(n.href);
  }, [router]);

  const handleMarkAllRead = useCallback(() => {
    const previous = items;
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    void markAllNotificationsRead().catch(() => {
      setItems(previous);
      setUnreadCount(previous.filter((n) => !n.isRead).length);
    });
  }, [items]);

  const handleDelete = useCallback((id: string) => {
    let removed: AppNotification | undefined;
    let index = -1;

    setItems((prev) => {
      index = prev.findIndex((n) => n.id === id);
      removed = prev[index];
      return prev.filter((n) => n.id !== id);
    });
    if (removed && !removed.isRead) setUnreadCount((c) => Math.max(0, c - 1));

    void deleteNotification(id).catch(() => {
      setItems((prev) => {
        if (!removed) return prev;
        const next = [...prev];
        next.splice(Math.max(index, 0), 0, removed);
        return next;
      });
      if (removed && !removed.isRead) setUnreadCount((c) => c + 1);
    });
  }, []);

  const groupLabel = useCallback((g: NotificationGroup) => {
    if (g === 'today') return lang === 'ar' ? 'اليوم' : 'Today';
    if (g === 'week')  return lang === 'ar' ? 'هذا الأسبوع' : 'This week';
    return lang === 'ar' ? 'أقدم' : 'Earlier';
  }, [lang]);

  /* الوقت النسبي بيتحدّث لحاله كل دقيقة، زي لوحة الجرس */
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const groups = groupNotifications(visibleItems);

  const tx = {
    title:       lang === 'ar' ? 'الإشعارات'                : 'Notifications',
    subtitle:    lang === 'ar' ? 'كل التحديثات في مكان واحد' : 'Every update in one place',
    all:         lang === 'ar' ? 'الكل'                      : 'All',
    unread:      lang === 'ar' ? 'غير مقروءة'                : 'Unread',
    markAll:     lang === 'ar' ? 'تعليم الكل كمقروء'         : 'Mark all as read',
    loadMore:    lang === 'ar' ? 'تحميل المزيد'              : 'Load more',
    empty:       lang === 'ar' ? 'لا توجد إشعارات'           : 'No notifications',
    emptyUnread: lang === 'ar' ? 'كل شيء مقروء'              : 'Nothing unread',
    delete:      lang === 'ar' ? 'حذف'                        : 'Delete',
  };

  const bg = isDark ? 'var(--card)' : '#ffffff';
  const border = isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)';
  const headerBg = isDark ? 'var(--background-alt)' : '#f5f5ef';
  const divider = isDark ? 'var(--divider)' : 'rgba(0,0,0,0.06)';

  return (
    <LazyMotion features={domAnimation}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1
              className="text-lg font-black uppercase tracking-widest"
              style={{ color: 'var(--foreground)', fontFamily: arabicFont }}
            >
              {tx.title}
            </h1>
            <p className="mt-0.5 text-[12px] font-medium" style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}>
              {tx.subtitle}
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors"
              style={{ background: 'rgba(69,132,130,0.12)', color: '#458482', fontFamily: arabicFont }}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {tx.markAll}
            </button>
          )}
        </div>

        {/* Filter tabs — تبديل فوري بلا شبكة */}
        <div
          className="flex w-fit items-center gap-1 rounded-xl p-1"
          style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }}
        >
          {(['all', 'unread'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => handleFilterChange(f)}
              className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all"
              style={{
                background: filter === f ? '#458482' : 'transparent',
                color: filter === f ? '#ffffff' : 'var(--foreground-muted)',
                fontFamily: arabicFont,
              }}
            >
              {f === 'all' ? tx.all : tx.unread}
              {f === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
            </button>
          ))}
        </div>

        <div className="w-full overflow-hidden rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
          {visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <Bell className="h-6 w-6" style={{ color: 'var(--foreground-muted)', opacity: 0.5 }} />
              <span className="text-[13px] font-bold" style={{ color: 'var(--foreground)', fontFamily: arabicFont }}>
                {filter === 'unread' ? tx.emptyUnread : tx.empty}
              </span>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {groups.map(({ group, items: groupItems }) => (
                <div key={group}>
                  <div
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest"
                    style={{ background: headerBg, color: 'var(--foreground-muted)', borderBottom: `1px solid ${divider}`, fontFamily: arabicFont }}
                  >
                    {groupLabel(group)}
                  </div>
                  {groupItems.map((n, i) => (
                    <m.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="group relative"
                      style={{ borderBottom: i === groupItems.length - 1 ? 'none' : `1px solid ${divider}` }}
                    >
                      <NotificationItem notification={n} isDark={isDark} onSelect={handleSelect} />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                        aria-label={tx.delete}
                        title={tx.delete}
                        className="absolute top-3 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer rounded-lg p-1.5"
                        style={{
                          [isRTL ? 'left' : 'right']: '0.75rem',
                          color: 'var(--foreground-muted)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--foreground-muted)'; }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </m.div>
                  ))}
                </div>
              ))}
            </AnimatePresence>
          )}

          {/* "تحميل المزيد" بيكمّل القائمة الكاملة دايمًا — الفلتر مطبّق بعده محليًا */}
          {cursor && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex w-full cursor-pointer items-center justify-center gap-2 py-3 text-[12px] font-bold transition-colors disabled:cursor-not-allowed"
              style={{ color: '#458482', borderTop: `1px solid ${divider}`, fontFamily: arabicFont }}
            >
              {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {tx.loadMore}
            </button>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}