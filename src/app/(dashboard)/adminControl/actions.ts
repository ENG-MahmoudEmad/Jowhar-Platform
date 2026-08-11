// src/app/(dashboard)/adminControl/actions.ts
// كل عمليات Admin Control الحساسة (accept/reject/suspend) — دايمًا بتتفحص
// صلاحيات الـ actor من طرف السيرفر، مش بس إخفاء بالواجهة.
//
// الحراسات نفسها بـ `./guards.ts`: نفس الفحص الموجود بـ proxy.ts، بس مستقل
// تمامًا عنه (defense in depth) — الـ middleware ممكن ينخدع أو يتخطاه حد،
// والـ Server Action لازم تتأكد بنفسها.
//
// كل فعل هون بينسجّل بـ admin_audit_log عبر logAudit() — هدول أهم الأفعال
// الإدارية بالمنصة (قبول/رفض/إيقاف)، لازم يكون فيه سجل واضح مين عملها وإمتى.
'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { canManage } from '@/lib/permissions/hierarchy';
import { requireAdminActor, loadTarget, logAudit } from './guards';

async function sendAccountApprovedEmail(email: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) return;

  const subject = 'تم تفعيل حسابك | Your account was approved';
  const text = [
    'تم تفعيل حسابك بنجاح.',
    'يمكنك الآن تسجيل الدخول إلى المنصة واستخدام حسابك.',
    '',
    'Your account has been approved.',
    'You can now sign in and use your account.',
  ].join('\n');

  const html = `
    <div style="direction:rtl;font-family:Arial,sans-serif;line-height:1.7;color:#1f2937;background:#f8fafc;padding:24px">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px">
        <div style="font-size:20px;font-weight:700;margin-bottom:16px">تم تفعيل حسابك</div>
        <p style="margin:0 0 12px">تم تفعيل حسابك بنجاح. يمكنك الآن تسجيل الدخول إلى المنصة واستخدام حسابك.</p>
        <p style="margin:0;color:#4b5563">Your account has been approved. You can now sign in and use your account.</p>
      </div>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error('account_approved_email_failed', response.status, details);
  }
}

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

  if (error) throw new Error(`accept_failed: ${error.message} (${error.code})`);

  await logAudit(supabase, memberId, 'member_accepted');

  const adminClient = createAdminClient();
  const { data: authUser } = await adminClient.auth.admin.getUserById(memberId);
  const email = authUser?.user?.email ?? null;

  if (email) {
    await sendAccountApprovedEmail(email);
  }

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

  await logAudit(supabase, memberId, 'member_rejected');

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

  await logAudit(supabase, memberId, 'member_suspended', { days, suspended_until: suspendedUntil });

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

  await logAudit(supabase, memberId, 'member_suspension_lifted');

  revalidatePath('/adminControl');
}