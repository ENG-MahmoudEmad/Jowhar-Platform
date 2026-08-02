// src/app/(dashboard)/adminControl/actions.ts
// كل عمليات Admin Control الحساسة (accept/reject/suspend) — دايمًا بتتفحص
// صلاحيات الـ actor من طرف السيرفر، مش بس إخفاء بالواجهة.
//
// الحراسات نفسها بـ `./guards.ts`: نفس الفحص الموجود بـ proxy.ts، بس مستقل
// تمامًا عنه (defense in depth) — الـ middleware ممكن ينخدع أو يتخطاه حد،
// والـ Server Action لازم تتأكد بنفسها.
'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { canManage } from '@/lib/permissions/hierarchy';
import { requireAdminActor, loadTarget } from './guards';

// ===========================================================
// Accept pending signup
// ===========================================================
export async function acceptMember(memberId: string) {
  const { supabase, actor } = await requireAdminActor();

  const { error } = await supabase
    .from('profiles')
    .update({
      status: 'active',
      approved_by: actor.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .eq('status', 'pending_approval'); // يمنع قبول طلب مش pending أصلاً (race condition)

  if (error) throw new Error('accept_failed');

  // TODO: إرسال إيميل "تم تفعيل حسابك" (Resend، متسق مع باقي القوالب الحالية)
  revalidatePath('/adminControl');
}

// ===========================================================
// Reject pending signup
// ===========================================================
export async function rejectMember(memberId: string) {
  const { supabase, actor } = await requireAdminActor();

  const { data: target } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', memberId)
    .eq('status', 'pending_approval')
    .single();

  if (!target) throw new Error('not_found');

  const adminClient = createAdminClient();
  const { data: authUser } = await adminClient.auth.admin.getUserById(memberId);
  const email = authUser?.user?.email ?? null;

  const { error } = await supabase
    .from('profiles')
    .update({
      status: 'rejected',
      rejected_by: actor.id,
      rejected_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) throw new Error('reject_failed');

  // تسجيل محاولة الرفض لمنطق الحظر (5 محاولات = حظر أسبوعين)
  const forwardedFor = (await headers()).get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() ?? null;

  if (email) {
    await supabase.from('signup_attempts').insert({
      email,
      ip_address: ip,
      rejected_at: new Date().toISOString(),
    });
  }

  revalidatePath('/adminControl');
}

// ===========================================================
// Suspend member
// ===========================================================
export async function suspendMember(memberId: string, days: number) {
  const { supabase, actor } = await requireAdminActor();

  if (!Number.isFinite(days) || days < 1) throw new Error('invalid_days');

  const target = await loadTarget(supabase, memberId);
  if (!canManage(actor, target)) throw new Error('forbidden');

  const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('profiles')
    .update({
      is_suspended: true,
      suspended_until: suspendedUntil,
      suspended_by: actor.id,
    })
    .eq('id', memberId);

  if (error) throw new Error('suspend_failed');

  revalidatePath('/adminControl');
}

// ===========================================================
// Lift suspension
// ===========================================================
export async function liftSuspension(memberId: string) {
  const { supabase, actor } = await requireAdminActor();

  const target = await loadTarget(supabase, memberId);
  if (!canManage(actor, target)) throw new Error('forbidden');

  const { error } = await supabase
    .from('profiles')
    .update({
      is_suspended: false,
      suspended_until: null,
      suspended_by: null,
    })
    .eq('id', memberId);

  if (error) throw new Error('lift_failed');

  revalidatePath('/adminControl');
}