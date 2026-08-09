// src/lib/notifications.ts
// أنواع الإشعارات ومساعداتها — مشتركة بين الجرس وصفحة "عرض الكل" لاحقًا.
//
// ⚠️ لازم تطابق enum `notification_type` بالداتابيز حرفيًا (مايجريشن 016).
// أي قيمة هون بدون مقابل بالـ enum، أو العكس، بتفشل بصمت أو بتكسر الواجهة —
// نفس الدرس اللي ضربنا فيه بمايجريشن 018 (cast الأنواع).

export type NotificationType =
  | 'task_assigned'          // تاسك جديدة انعطتلك
  | 'note_received'          // ملاحظة مدير جديدة
  | 'note_reply'             // رد على ملاحظة
  | 'signup_pending'         // طلب تسجيل بانتظار الموافقة (للأدمن)
  | 'signup_resolved'        // فلان حسم طلب تسجيل (لباقي الأدمنية)
  | 'account_approved'       // حسابك انقبل
  | 'account_rejected'       // حسابك انرفض
  | 'email_change_pending'   // طلب تغيير إيميل بانتظار الموافقة (للأدمن)
  | 'email_change_approved'  // تمت الموافقة على تغيير إيميلك
  | 'email_change_rejected'  // تم رفض تغيير إيميلك
  | 'news_published'         // خبر جديد
  | 'task_submitted'         // عضو سلّم تاسك للمراجعة (للأدمن المخوّل)
  | 'task_approved'          // تمت الموافقة على تسليمك
  | 'task_rejected';         // تم رفض تسليمك

export interface AppNotification {
  id: string;
  type: NotificationType;
  /** مين سبّب الإشعار. `null` للأحداث النظامية */
  actorName: string | null;
  actorAvatarUrl: string | null;
  actorColor: string;
  /** نص الحدث — العنوان بس، الجملة الكاملة بتتركّب بالواجهة */
  subject: string;
  /**
   * الوجهة عند الضغط. لازم توصل للعنصر نفسه مش للصفحة فقط:
   * `/my-tasks#task-abc` — والصفحة الهدف لازم تعرف تسكرول وتضوّي العنصر.
   */
  href: string;
  isRead: boolean;
  createdAt: string; // ISO
}

/* ─── الوقت النسبي ─────────────────────────────────────────────────────────── */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(iso: string, lang: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const isAr = lang === 'ar';

  if (diff < MINUTE) return isAr ? 'الآن' : 'just now';

  const mins = Math.floor(diff / MINUTE);
  if (mins < 60) {
    if (!isAr) return `${mins}m ago`;
    if (mins === 1) return 'منذ دقيقة';
    if (mins === 2) return 'منذ دقيقتين';
    return mins <= 10 ? `منذ ${mins} دقائق` : `منذ ${mins} دقيقة`;
  }

  const hours = Math.floor(diff / HOUR);
  if (hours < 24) {
    if (!isAr) return `${hours}h ago`;
    if (hours === 1) return 'منذ ساعة';
    if (hours === 2) return 'منذ ساعتين';
    return hours <= 10 ? `منذ ${hours} ساعات` : `منذ ${hours} ساعة`;
  }

  const days = Math.floor(diff / DAY);
  if (days < 7) {
    if (!isAr) return `${days}d ago`;
    if (days === 1) return 'أمس';
    if (days === 2) return 'منذ يومين';
    return `منذ ${days} أيام`;
  }

  return new Date(iso).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

/* ─── التجميع الزمني ───────────────────────────────────────────────────────── */

export type NotificationGroup = 'today' | 'week' | 'older';

export function groupOf(iso: string, now = Date.now()): NotificationGroup {
  const diff = now - new Date(iso).getTime();
  if (diff < DAY) return 'today';
  if (diff < 7 * DAY) return 'week';
  return 'older';
}

export function groupNotifications(
  items: AppNotification[],
  now = Date.now()
): { group: NotificationGroup; items: AppNotification[] }[] {
  const buckets: Record<NotificationGroup, AppNotification[]> = {
    today: [],
    week: [],
    older: [],
  };

  [...items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .forEach((n) => buckets[groupOf(n.createdAt, now)].push(n));

  return (['today', 'week', 'older'] as const)
    .filter((g) => buckets[g].length > 0)
    .map((g) => ({ group: g, items: buckets[g] }));
}