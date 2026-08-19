// src/app/auth/confirm/route.ts
// بيستقبل روابط التأكيد (تسجيل جديد، استرجاع كلمة سر، أو تغيير إيميل)،
// بيتحقق منها، وبينشئ جلسة فعلية قبل ما يوجّه المستخدم

import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * إقفال طلب تغيير الإيميل بعد ما العضو يضغط رابط التأكيد.
 *
 * بتنادى بعد **أي** تحقق ناجح، مش بس روابط تغيير الإيميل: الدالة بالداتابيز
 * بتقارن `new_email` مع `auth.users.email` الفعلي، فلو الرابط كان لتأكيد
 * تسجيل أو استعادة كلمة سر ما بيصير شي إطلاقًا.
 *
 * فشلها ما بيمنع الدخول — أسوأ حالة إن الطلب يضل معلّق بالواجهة، وهذا
 * أهون بكتير من رفض رابط تأكيد صحيح.
 */
async function finalizeEmailChange(supabase: SupabaseServerClient) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.rpc('complete_email_change', { p_user_id: user.id });
  } catch {
    // متعمّد: التحقق نجح، وهذا مجرد تنظيف
  }
}

/*
  نفس الستايل الداكن تبع قالب "Confirm your email" — مستطيل عريض
  (600px)، ثنائي اللغة، بزر يودّي على /adminControl مباشرة (مش الموقع
  عمومًا، لأن الغاية هون فعل محدد: مراجعة الطلب).
*/
function buildNewSignupEmailHtml(memberName: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>New signup pending approval</title>
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
                طلب تسجيل جديد بانتظار المراجعة
              </h1>
              <p style="margin:0 0 6px 0; font-size:14px; line-height:21px; color:#8b9a99; direction:rtl;">
                ${memberName} سجّل حساباً جديداً وأكّد بريده الإلكتروني، وهو الآن بانتظار موافقتك لتفعيله.
              </p>
              <p style="margin:0 0 26px 0; font-size:13px; line-height:20px; color:#5a6666;">
                ${memberName} signed up and confirmed their email. Their account is now pending your approval.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td align="center" style="border-radius:8px; background-color:#458482;">
                    <a href="https://www.jowharhub.com/adminControl"
                       target="_blank"
                       style="display:inline-block; padding:12px 40px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">
                      Review in Admin Control
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
}

async function sendSignupEmail(to: string[], memberName: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || to.length === 0) return;

  const subject = `${memberName} — طلب تسجيل جديد | New signup request`;
  const text = [
    `${memberName} سجّل حساباً جديداً وأكّد بريده الإلكتروني، وهو الآن بانتظار موافقتك لتفعيله.`,
    '',
    `${memberName} signed up and confirmed their email. Their account is now pending your approval.`,
    '',
    'https://www.jowharhub.com/adminControl',
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html: buildNewSignupEmailHtml(memberName),
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error('new_signup_admin_email_failed', response.status, details);
  }
}

/**
 * تنبيه الشيف أدمن والديفيلوبر (وبس هدول الاثنين) بعضو جديد أكّد إيميله
 * وبانتظار الموافقة. بتنادى مرة وحدة، فقط لما `type === 'email'`
 * (تأكيد تسجيل — مش استعادة كلمة سر ولا تغيير إيميل).
 *
 * فشلها ما بيمنع تسجيل دخول العضو الجديد — نفس فلسفة finalizeEmailChange:
 * إشعار بريدي ثانوي أهون بكتير من كسر تدفق التسجيل الأساسي.
 */
async function notifyAdminsOfNewSignup(newUserId: string) {
  try {
    const adminClient = createAdminClient();

    const { data: newProfile } = await adminClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', newUserId)
      .single();

    const memberName = newProfile
      ? `${newProfile.first_name ?? ''} ${newProfile.last_name ?? ''}`.trim() || 'A new member'
      : 'A new member';

    const { data: recipients } = await adminClient
      .from('profiles')
      .select('id')
      .or('is_chief.eq.true,is_developer.eq.true')
      .eq('status', 'active')
      .is('deleted_at', null);

    if (!recipients || recipients.length === 0) return;

    const emails = (
      await Promise.all(
        recipients.map(async (r) => {
          const { data } = await adminClient.auth.admin.getUserById(r.id);
          return data?.user?.email ?? null;
        })
      )
    ).filter((e): e is string => Boolean(e));

    if (emails.length === 0) return;

    await sendSignupEmail(emails, memberName);
  } catch {
    // متعمّد: تأكيد التسجيل الفعلي أهم من إشعار الأدمن
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/pending-approval';

  const supabase = await createClient();

  // الطريقة الأساسية: token_hash (الموصى بها لـ SSR)
  // type بيكون 'email' لتأكيد التسجيل و 'recovery' لاسترجاع كلمة السر
  // و 'email_change' لتأكيد الإيميل الجديد
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      await finalizeEmailChange(supabase);

      if (type === 'email') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await notifyAdminsOfNewSignup(user.id);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=invalid_confirmation_link`);
  }

  // احتياطي: لو جاء بصيغة code (PKCE)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await finalizeEmailChange(supabase);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) await notifyAdminsOfNewSignup(user.id);

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_confirmation_link`);
}