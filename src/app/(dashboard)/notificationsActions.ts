// src/app/(dashboard)/notificationsActions.ts
// قراءة الإشعارات وتعليمها — التوليد كله بـ triggers، فما في `create` هون.
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { AppNotification, NotificationType } from '@/lib/notifications';

const PANEL_LIMIT = 20;
const FALLBACK_COLOR = '#0d9488';

type Row = {
  id: string;
  type: NotificationType;
  actor_id: string | null;
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
  id, type, actor_id, subject, href, is_read, created_at,
  actor:profiles!notifications_actor_id_fkey (
    first_name, last_name, color, avatar_url
  )
`;

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