// src/app/(dashboard)/adminControl/guards.ts
// حراسات مشتركة لكل أكشنز Admin Control.
// ⚠️ هذا الملف بدون 'use server' عن قصد — ملفات 'use server' مسموح تصدّر
// دوال async فقط، فالمساعدات المشتركة لازم تعيش بره.

import { createClient } from '@/lib/supabase/server';
import {
  canAccessAdminControl,
  canManage,
  canOpen,
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
 * حارس الإجراءات الإدارية الثقيلة: إيقاف، تغيير دور، منح صلاحية.
 * الـ Chief والـ Developer محميين منها تمامًا، وما حدا بيديرها على نفسه.
 */
export async function requireManagedTarget(
  memberId: string,
  permissionKey: string
) {
  const { supabase, actor } = await requireAdminActor();

  if (!(await hasCapability(supabase, actor, permissionKey))) {
    throw new Error('forbidden');
  }

  const target = await loadTarget(supabase, memberId);
  if (!canManage(actor, target)) throw new Error('forbidden');

  return { supabase, actor, target };
}

/**
 * حارس "الفتح": إضافة تاسك أو ملاحظة — أوسع من الإدارة.
 *
 * كل واحد يقدر يفتح صفه، والـ Chief والـ Developer يفتحوا أي حد بما فيهم
 * بعض. إضافة تاسكة أو ملاحظة مش تدخّل بالصلاحيات، فما في سبب تمنعها عن
 * الـ Chief — هذا اللي كان بيمنع الـ Developer من إعطاء الـ Chief تاسكات.
 *
 * مطابق لـ `can_open_member()` بالداتابيز (مايجريشن 011) — أي تعديل هون
 * لازم يقابله مايجريشن، والعكس (درس #9).
 */
export async function requireOpenableTarget(
  memberId: string,
  permissionKey: string
) {
  const { supabase, actor } = await requireAdminActor();

  if (!(await hasCapability(supabase, actor, permissionKey))) {
    throw new Error('forbidden');
  }

  if (memberId === actor.id) {
    return { supabase, actor, target: null };
  }

  const target = await loadTarget(supabase, memberId);
  if (!canOpen(actor, target)) throw new Error('forbidden');

  return { supabase, actor, target };
}

export function fullName(first: string | null, last: string | null): string {
  return `${first ?? ''} ${last ?? ''}`.trim() || '—';
}