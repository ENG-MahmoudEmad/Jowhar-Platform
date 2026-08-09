// src/components/dashboard/notifications/NotificationBell.tsx
"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import { useCurrentUser } from '@/context/UserContext';
import { createClient } from '@/lib/supabase/client';
import type { AppNotification } from '@/lib/notifications';
import {
  listMyNotifications,
  getNotification,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/app/(dashboard)/notificationsActions';
import NotificationPanel from './NotificationPanel';

const TEXT_MUTED = 'var(--foreground-muted)';

function NotificationBell() {
  const { lang } = useLang();
  const { theme } = useTheme();
  const { user } = useCurrentUser();
  const router = useRouter();
  const isDark = theme === 'dark';

  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  /* ── الجلب الأولي ── */
  useEffect(() => {
    let active = true;

    listMyNotifications()
      .then((rows) => { if (active) setNotifications(rows); })
      .catch(() => { if (active) setNotifications([]); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  /*
    ── البث اللحظي ──
    الاشتراك بيسمع INSERT و UPDATE على صفوف المستخدم فقط.

    ليش لازم UPDATE كمان مش INSERT بس: الحسم الجماعي
    (`resolve_notification_group`) بيعدّل صفوف موجودة — فلما أدمن تاني
    يوافق على طلب تسجيل، الإشعار عندك بينعلّم مقروء **من غير أي فعل
    منك**، ولازم الجرس يعكس هذا فورًا.

    الفلتر بالكلاينت للكفاءة مش للحماية — الـ RLS بتمنع أصلاً وصول
    إشعارات غيرك حتى لو الفلتر انشال.
  */
  const userId = user?.id;
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const id = (payload.new as { id: string }).id;
          if (notificationsRef.current.some((n) => n.id === id)) return;

          /*
            الصف الخام ما فيه اسم المُرسِل ولا لونه (بيجوا بـ join)،
            فبنجيب النسخة الكاملة بدل ما نعرض إشعارًا ناقصًا.
          */
          void getNotification(id).then((n) => {
            if (n) setNotifications((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; is_read: boolean };
          setNotifications((prev) =>
            prev.map((n) => (n.id === row.id ? { ...n, isRead: row.is_read } : n))
          );
        }
      )
      // .subscribe();
      .subscribe((status) => console.log('REALTIME:', status));

    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  /*
    ⚠️ ما في `whileHover={{ scale }}`: Framer Motion بيشتغل بـ spring
    افتراضي، فالزر بيتمطط ويرتد ويستقر ببطء — بيحس "معلّق".
  */
  const buttonStyle = useMemo<React.CSSProperties>(() => {
    const idleBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
    const hoverBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

    return {
      background: open ? 'rgba(69,132,130,0.14)' : (hovered ? hoverBg : idleBg),
      border: `1px solid ${open ? 'rgba(69,132,130,0.4)' : 'var(--card-border)'}`,
      color: open || hovered ? '#458482' : TEXT_MUTED,
    };
  }, [isDark, open, hovered]);

  const badgeStyle = useMemo<React.CSSProperties>(() => ({
    background: '#ef4444',
    borderColor: isDark ? '#0d1117' : '#F9F9F3',
  }), [isDark]);

  const toggle = useCallback(() => setOpen((o) => !o), []);
  const close = useCallback(() => setOpen(false), []);
  const handleEnter = useCallback(() => setHovered(true), []);
  const handleLeave = useCallback(() => setHovered(false), []);

  /*
    الضغط على الصف بيعلّمه مقروء **هو وحده** — فتح اللوحة ما بيعلّم الكل.
    المستخدم بيفتح الجرس عشان يشوف شو في، ولو انمسح كل شي بمجرد الفتح
    بيضيع اللي ما لحق يقرأه.
  */
  const handleSelect = useCallback((n: AppNotification) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
    );
    setOpen(false);

    void markNotificationRead(n.id).catch(() => {
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: false } : item))
      );
    });

    router.push(n.href);
  }, [router]);

  const handleMarkAllRead = useCallback(() => {
    const previous = notificationsRef.current;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    void markAllNotificationsRead().catch(() => setNotifications(previous));
  }, []);

  const handleViewAll = useCallback(() => {
    setOpen(false);
    router.push('/notifications');
  }, [router]);

  const label = lang === 'ar' ? 'الإشعارات' : 'Notifications';

  return (
    /*
      relative على الحاوية: اللوحة بالديسكتوب موضعها نسبةً للجرس.
    */
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={label}
        className="relative cursor-pointer rounded-xl p-2.5 transition-colors duration-150 active:scale-95"
        style={buttonStyle}
      >
        <Bell size={17} />

        {/*
          البادج يُكتسب: رقم فعلي للأحداث اللي بدها تصرّف، مش نقطة دائمة.
          فوق 9 بتصير 9+ عشان ما تكبر الدائرة وتكسر التوازن.
        */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -end-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 px-1 text-[9px] font-black text-white"
            style={badgeStyle}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationPanel
        open={open}
        notifications={notifications}
        loading={loading}
        isDark={isDark}
        onClose={close}
        onSelect={handleSelect}
        onMarkAllRead={handleMarkAllRead}
        onViewAll={handleViewAll}
      />
    </div>
  );
}

export default memo(NotificationBell);