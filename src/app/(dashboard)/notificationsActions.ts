// src/app/(dashboard)/notificationsActions.ts
// قراءة الإشعارات وتعليمها — التوليد كله بـ triggers، فما في `create` هون.
'use server';

import { createClient } from '@/lib/supabase/server';
import type { AppNotification, NewsPostType, NotificationType } from '@/lib/notifications';

const PANEL_LIMIT = 20;
const PAGE_SIZE = 25;
const FALLBACK_COLOR = '#0d9488';

const NEWS_TYPES: readonly NewsPostType[] = ['announcement', 'update', 'alert'];

type Row = {
  id: string;
  type: NotificationType;
  actor_id: string | null;
  entity_type: string | null;
  subject: string;
  href: string;
  is_read: boolean;
  created_at: string;
  actor: {
    first_name: string | null;
    last_name: string | null;
    color: string | null;
    avatar_url: string | null;
  } | null;
};

/*
  اسم المُرسِل ولونه بـ join مش مخزّنين بالإشعار — نفس قاعدة ردود
  الملاحظات: تغيير الاسم أو اللون بينعكس على الإشعارات القديمة تلقائيًا.
*/
const SELECT_COLUMNS = `
  id, type, actor_id, entity_type, subject, href, is_read, created_at,
  actor:profiles!notifications_actor_id_fkey (
    first_name, last_name, color, avatar_url
  )
`;

/*
  entity_type لإشعارات الأخبار مخزّن بصيغة 'news_post:<type>' (مايجريشن
  20260816000000) — هون بنستخرج الجزء الثاني ونتأكد إنه قيمة معروفة.
  إشعارات أقدم من المايجريشن ('news_post' بدون نوع) بترجع null، والواجهة
  بترجع للجملة العامة القديمة بهالحالة (تراجع آمن، مش انهيار).
*/
function extractNewsType(entityType: string | null): NewsPostType | null {
  if (!entityType) return null;
  const [prefix, suffix] = entityType.split(':');
  if (prefix !== 'news_post' || !suffix) return null;
  return (NEWS_TYPES as readonly string[]).includes(suffix) ? (suffix as NewsPostType) : null;
}

function toNotification(row: Row): AppNotification {
  const name = `${row.actor?.first_name ?? ''} ${row.actor?.last_name ?? ''}`.trim();
  return {
    id: row.id,
    type: row.type,
    actorName: name || null,
    actorAvatarUrl: row.actor?.avatar_url ?? null,
    actorColor: row.actor?.color || FALLBACK_COLOR,
    subject: row.subject,
    href: row.href,
    isRead: row.is_read,
    createdAt: row.created_at,
    newsType: row.type === 'news_published' ? extractNewsType(row.entity_type) : null,
  };
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthenticated');
  return { supabase, userId: user.id };
}

/**
 * إشعارات لوحة الجرس — آخر 20 فقط.
 * اللوحة مش أرشيف: اللي بده الكل بيروح لـ `/notifications`.
 */
export async function listMyNotifications(limit = PANEL_LIMIT): Promise<AppNotification[]> {
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from('notifications')
    .select(SELECT_COLUMNS)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error('notifications_fetch_failed');
  return (data ?? []).map((r) => toNotification(r as unknown as Row));
}

/** إشعار واحد — يُستعمل بعد وصول حدث لحظي، بدل إعادة جلب القائمة كاملة */
export async function getNotification(id: string): Promise<AppNotification | null> {
  const { supabase, userId } = await requireUser();

  const { data } = await supabase
    .from('notifications')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .eq('recipient_id', userId)
    .maybeSingle();

  return data ? toNotification(data as unknown as Row) : null;
}

/**
 * صفحة كاملة من الإشعارات — لصفحة `/notifications`.
 * `cursor` = createdAt آخر عنصر بالصفحة السابقة (keyset pagination بدل
 * offset)، عشان صفحة جديدة توصل أثناء التصفح ما تزحزح النتائج.
 */
export async function listMyNotificationsPage(options: {
  onlyUnread?: boolean;
  cursor?: string | null;
  limit?: number;
} = {}): Promise<{ items: AppNotification[]; nextCursor: string | null }> {
  const { supabase, userId } = await requireUser();
  const limit = options.limit ?? PAGE_SIZE;

  let query = supabase
    .from('notifications')
    .select(SELECT_COLUMNS)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit + 1); // صف زيادة عشان نعرف إذا في صفحة تانية

  if (options.onlyUnread) query = query.eq('is_read', false);
  if (options.cursor) query = query.lt('created_at', options.cursor);

  const { data, error } = await query;
  if (error) throw new Error('notifications_fetch_failed');

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: page.map((r) => toNotification(r as unknown as Row)),
    nextCursor: hasMore ? page[page.length - 1].created_at : null,
  };
}

export async function markNotificationRead(notificationId: string) {
  const { supabase, userId } = await requireUser();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('recipient_id', userId) // حارس صريح فوق الـ RLS
    .eq('is_read', false);      // ما بنكتب فوق وقت قراءة سابق

  if (error) throw new Error('mark_read_failed');
}

export async function markAllNotificationsRead() {
  const { supabase, userId } = await requireUser();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) throw new Error('mark_all_failed');
}

export async function deleteNotification(notificationId: string) {
  const { supabase, userId } = await requireUser();

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('recipient_id', userId);

  if (error) throw new Error('delete_failed');
}