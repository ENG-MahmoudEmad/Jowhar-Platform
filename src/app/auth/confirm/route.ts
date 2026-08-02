// src/app/auth/confirm/route.ts
// بيستقبل روابط التأكيد (تسجيل جديد، استرجاع كلمة سر، أو تغيير إيميل)،
// بيتحقق منها، وبينشئ جلسة فعلية قبل ما يوجّه المستخدم

import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

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
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=invalid_confirmation_link`);
  }

  // احتياطي: لو جاء بصيغة code (PKCE)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await finalizeEmailChange(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_confirmation_link`);
}