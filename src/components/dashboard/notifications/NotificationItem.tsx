// src/components/dashboard/notifications/NotificationItem.tsx
"use client";

import React, { memo, useCallback, useMemo } from 'react';
import {
  ListTodo, NotebookPen, MessageSquare, UserPlus, UserCheck,
  CheckCircle2, XCircle, Mail, Newspaper, Bell,
} from 'lucide-react';
import { useLang } from '@/context/LangContext';
import { relativeTime, type AppNotification, type NotificationType } from '@/lib/notifications';

/*
  شارة صغيرة على الأفاتار بتقول نوع الحدث — أسرع من قراءة الجملة كاملة
  لما تكون بتمسح القائمة بسرعة.

  ⚠️ Record<NotificationType, ...> كامل عن قصد: لو نوع جديد انضاف
  بالـ enum بالداتابيز ونُسي هون، TypeScript بيرفض يبني — بدل ما ينهار
  وقت التشغيل زي ما صار (meta === undefined).
*/
const TYPE_META: Record<NotificationType, { Icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  task_assigned:          { Icon: ListTodo,      color: '#458482' },
  note_received:          { Icon: NotebookPen,   color: '#e0a740' },
  note_reply:             { Icon: MessageSquare, color: '#458482' },
  signup_pending:         { Icon: UserPlus,      color: '#8b5cf6' },
  signup_resolved:        { Icon: UserCheck,     color: '#8b5cf6' },
  account_approved:       { Icon: CheckCircle2,  color: '#10b981' },
  account_rejected:       { Icon: XCircle,       color: '#ef4444' },
  email_change_pending:   { Icon: Mail,          color: '#e0a740' },
  email_change_approved:  { Icon: CheckCircle2,  color: '#10b981' },
  email_change_rejected:  { Icon: XCircle,       color: '#ef4444' },
  news_published:         { Icon: Newspaper,     color: '#3b82f6' },
};

/* حارس أخير: لو نوع ما بالخريطة لأي سبب، أيقونة محايدة بدل انهيار الصفحة */
const FALLBACK_META = { Icon: Bell, color: '#458482' };

function initialsOf(name: string | null): string {
  if (!name) return '•';
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function NotificationItem({
  notification,
  isDark,
  onSelect,
}: {
  notification: AppNotification;
  isDark: boolean;
  onSelect: (n: AppNotification) => void;
}) {
  const { lang, isRTL } = useLang();
  const arabicFont = lang === 'ar' ? 'var(--font-arabic)' : 'inherit';

  const meta = TYPE_META[notification.type] ?? FALLBACK_META;
  const { Icon } = meta;

  /* الجملة بتتركّب هون مش بتتخزن — تغيير الصياغة ما بيحتاج migration */
  const sentence = useMemo(() => {
    const actor = notification.actorName;
    const isAr = lang === 'ar';

    switch (notification.type) {
      case 'task_assigned':
        return isAr ? `${actor} أضاف لك مهمة` : `${actor} assigned you a task`;
      case 'note_received':
        return isAr ? `${actor} أرسل لك ملاحظة` : `${actor} sent you a note`;
      case 'note_reply':
        return isAr ? `${actor} رد على ملاحظة` : `${actor} replied to a note`;
      case 'signup_pending':
        return isAr ? `${actor} يطلب الانضمام` : `${actor} requested to join`;
      case 'signup_resolved':
        return isAr ? `${actor} حسم طلب انضمام` : `${actor} resolved a signup request`;
      case 'account_approved':
        return isAr ? 'تم تفعيل حسابك' : 'Your account was approved';
      case 'account_rejected':
        return isAr ? 'لم تتم الموافقة على حسابك' : 'Your account was not approved';
      case 'email_change_pending':
        return isAr ? `${actor} يطلب تغيير إيميله` : `${actor} requested an email change`;
      case 'email_change_approved':
        return isAr ? 'تمت الموافقة على تغيير إيميلك' : 'Your email change was approved';
      case 'email_change_rejected':
        return isAr ? 'تم رفض طلب تغيير الإيميل' : 'Your email change was rejected';
      case 'news_published':
        return isAr ? `${actor} نشر خبراً جديداً` : `${actor} published an update`;
      default:
        return '';
    }
  }, [notification.type, notification.actorName, lang]);

  const handleClick = useCallback(() => onSelect(notification), [onSelect, notification]);

  return (
    <button
      type="button"
      onClick={handleClick}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="group flex w-full items-start gap-3 px-4 py-3 text-start transition-colors"
      style={{
        background: notification.isRead
          ? 'transparent'
          : (isDark ? 'rgba(69,132,130,0.06)' : 'rgba(69,132,130,0.05)'),
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'; }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = notification.isRead
          ? 'transparent'
          : (isDark ? 'rgba(69,132,130,0.06)' : 'rgba(69,132,130,0.05)');
      }}
    >
      {/* Avatar + type badge */}
      <div className="relative shrink-0">
        <div
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-[10px] font-black text-white"
          style={{ background: notification.actorColor }}
        >
          {notification.actorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={notification.actorAvatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initialsOf(notification.actorName)
          )}
        </div>

        <span
          className="absolute -bottom-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full"
          style={{ background: meta.color, border: `2px solid ${isDark ? '#12151a' : '#ffffff'}` }}
        >
          <Icon size={8} className="text-white" />
        </span>
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p
          className="text-[12px] font-semibold leading-snug"
          style={{ color: 'var(--foreground)', fontFamily: arabicFont }}
        >
          {sentence}
        </p>
        <p
          className="mt-0.5 truncate text-[11px] font-medium"
          style={{ color: 'var(--foreground-muted)', fontFamily: arabicFont }}
        >
          {notification.subject}
        </p>
        <span
          className="mt-1 block text-[10px] font-medium"
          style={{ color: 'var(--foreground-muted)', opacity: 0.75, fontFamily: arabicFont }}
        >
          {relativeTime(notification.createdAt, lang)}
        </span>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: '#458482' }}
          aria-label={lang === 'ar' ? 'غير مقروء' : 'Unread'}
        />
      )}
    </button>
  );
}

export default memo(NotificationItem);