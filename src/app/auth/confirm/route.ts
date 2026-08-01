// src/app/auth/confirm/route.ts
// بيستقبل روابط التأكيد (تسجيل جديد أو استرجاع كلمة سر)،
// بيتحقق منها، وبينشئ جلسة فعلية قبل ما يوجّه المستخدم

import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/pending-approval';

  const supabase = await createClient();

  // الطريقة الأساسية: token_hash (الموصى بها لـ SSR)
  // type بيكون 'email' لتأكيد التسجيل، و 'recovery' لاسترجاع كلمة السر
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=invalid_confirmation_link`);
  }

  // احتياطي: لو جاء بصيغة code (PKCE)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_confirmation_link`);
}