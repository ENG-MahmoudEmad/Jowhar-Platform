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

/*
  نفس الستايل الداكن تبع قالب "Confirm your email" (Supabase Auth
  template) — بس بأبعاد مستطيلة عرضية (600px) بدل المربّعة (420px)
  المستخدمة بقالب التأكيد، وبمحتوى ثنائي اللغة (عربي/إنجليزي)، ويودّي
  على الموقع مباشرة بدل رابط تأكيد بتوكن.
*/
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
    '',
    'https://www.jowharhub.com/',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Your account was approved</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0f0f; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0f0f; padding:48px 24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#12191a; border-radius:12px; overflow:hidden; border:1px solid #1f2b2b;">

          <!-- Logo mark -->
          <tr>
            <td align="center" style="padding:36px 48px 0 48px;">
              <img src="https://www.jowharhub.com/logo.jpg" width="40" height="40" alt="Jowhar" style="border-radius:10px; display:block;">
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:20px 56px 36px 56px; text-align:center;">
              <h1 style="margin:0 0 10px 0; font-size:19px; line-height:26px; color:#f3f4f4; font-weight:600;">
                تم تفعيل حسابك
              </h1>
              <p style="margin:0 0 6px 0; font-size:14px; line-height:21px; color:#8b9a99; direction:rtl;">
                تم تفعيل حسابك بنجاح. يمكنك الآن تسجيل الدخول إلى المنصة واستخدام حسابك.
              </p>
              <p style="margin:0 0 26px 0; font-size:13px; line-height:20px; color:#5a6666;">
                Your account has been approved. You can now sign in and use your account.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td align="center" style="border-radius:8px; background-color:#458482;">
                    <a href="https://www.jowharhub.com/"
                       target="_blank"
                       style="display:inline-block; padding:12px 40px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">
                      Go to Jowhar
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 48px 28px 48px; border-top:1px solid #1f2b2b; text-align:center;">
              <p style="margin:0; font-size:11px; line-height:16px; color:#454e4e;">
                &copy; 2026 Jowhar &nbsp;·&nbsp; Animation Studio Workspace
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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