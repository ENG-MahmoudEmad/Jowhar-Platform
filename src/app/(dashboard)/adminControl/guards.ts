// src/app/(dashboard)/adminControl/guards.ts
// حراسات مشتركة لكل أكشنز Admin Control.
// ⚠️ هذا الملف بدون 'use server' عن قصد — ملفات 'use server' مسموح تصدّر
// دوال async فقط، فالمساعدات المشتركة لازم تعيش بره.

import { createClient } from '@/lib/supabase/server';
import {
  canAccessAdminControl,
  canManage,
  type Actor,
  type Target,
} from '@/lib/permissions/hierarchy';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** المستخدم الحالي + التأكد إنه يوصل Admin Control أصلاً. */
export async function requireAdminActor(): Promise<{
  supabase: ServerClient;
  actor: Actor;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthenticated');

  const { data: row } = await supabase
    .from('profiles')
    .select('id, is_chief, is_developer, access_role')
    .eq('id', user.id)
    .single();

  if (!row) throw new Error('forbidden');

  const actor: Actor = {
    id: row.id,
    isDeveloper: row.is_developer,
    isChief: row.is_chief,
    accessRole: row.access_role,
  };

  if (!canAccessAdminControl(actor)) throw new Error('forbidden');

  return { supabase, actor };
}

export async function loadTarget(
  supabase: ServerClient,
  memberId: string
): Promise<Target> {
  const { data } = await supabase
    .from('profiles')
    .select('id, is_chief, is_developer, access_role')
    .eq('id', memberId)
    .single();

  if (!data) throw new Error('not_found');

  return {
    id: data.id,
    isDeveloper: data.is_developer,
    isChief: data.is_chief,
    accessRole: data.access_role,
  };
}

/**
 * هل الـ actor يحمل مفتاح صلاحية معيّن؟
 * الـ Chief والـ Developer بيحملوا كل المفاتيح ضمنيًا — نفس منطق
 * has_admin_capability() بالداتابيز، متطابق قصدًا عشان ما يصير انحراف
 * بين اللي الواجهة بتسمح فيه واللي الـ RLS بترفضه.
 */
export async function hasCapability(
  supabase: ServerClient,
  actor: Actor,
  permissionKey: string
): Promise<boolean> {
  if (actor.isChief || actor.isDeveloper) return true;

  const { data } = await supabase
    .from('user_permissions')
    .select('permission_key')
    .eq('user_id', actor.id)
    .eq('permission_key', permissionKey)
    .maybeSingle();

  return Boolean(data);
}

/**
 * الحارس الكامل لأي إجراء بيمسّ عضو معيّن:
 * actor صالح + يحمل المفتاح + مسموح له يتحكم بهذا العضو تحديدًا.
 *
 * `allowSelf` لأن كل واحد يقدر يضيف لنفسه تاسكات، بينما `canManage`
 * بترجع false على النفس (ما حدا يقدر يوقّف نفسه أو يغيّر دوره).
 */
export async function requireManagedTarget(
  memberId: string,
  permissionKey: string,
  options: { allowSelf?: boolean } = {}
) {
  const { supabase, actor } = await requireAdminActor();

  if (!(await hasCapability(supabase, actor, permissionKey))) {
    throw new Error('forbidden');
  }

  if (options.allowSelf && memberId === actor.id) {
    return { supabase, actor, target: null };
  }

  const target = await loadTarget(supabase, memberId);
  if (!canManage(actor, target)) throw new Error('forbidden');

  return { supabase, actor, target };
}

export function fullName(first: string | null, last: string | null): string {
  return `${first ?? ''} ${last ?? ''}`.trim() || '—';
}