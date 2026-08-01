// src/proxy.ts
// Next.js 16: الاسم لازم يكون proxy.ts والفنكشن اسمها proxy

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// صفحات الدخول/التسجيل — الشخص النشط ما بيحتاجها
const authPaths = [
  '/login',
  '/signup',
  '/forgot-password',
];

/**
 * استثناء مهم: /reset-password ما بتنحط بـ authPaths.
 * لأن رابط الاسترجاع بينشئ جلسة صالحة فعلاً، فلو عاملناها كصفحة auth
 * رح نرجّع المستخدم للداشبورد قبل ما يقدر يغيّر كلمة السر.
 */
const RESET_PASSWORD_PATH = '/reset-password';

// مسارات لازم تشتغل حتى بدون حساب مكتمل
const publicPaths = [
  '/auth',              // معالجة تأكيد الإيميل (لازم تشتغل قبل وجود جلسة)
  '/check-email',
  '/pending-approval',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthPage = authPaths.some(p => pathname.startsWith(p));
  const isPublicPage = publicPaths.some(p => pathname.startsWith(p));
  const isResetPassword = pathname.startsWith(RESET_PASSWORD_PATH);

  // ---------- 1) ما فيه جلسة إطلاقًا ----------
  if (!user) {
    if (isAuthPage || isPublicPage || isResetPassword) return supabaseResponse;
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ---------- 2) فيه جلسة -> نفحص حالة الحساب الحقيقية ----------
  const { data: profile } = await supabase
    .from('profiles')
    .select('status, is_suspended, suspended_until, deleted_at')
    .eq('id', user.id)
    .single();

  // حساب محذوف (soft delete) -> اطرده فورًا
  if (!profile || profile.deleted_at) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=account_unavailable', request.url));
  }

  // إيقاف مؤقت لسا ساري (بينتهي تلقائيًا لما يعدي suspended_until)
  const suspensionActive =
    profile.is_suspended &&
    (!profile.suspended_until || new Date(profile.suspended_until) > new Date());

  if (suspensionActive) {
    await supabase.auth.signOut();
    // رسالة موحدة بدون تفاصيل (نفس فلسفة عدم كشف المعلومات)
    return NextResponse.redirect(new URL('/login?error=account_unavailable', request.url));
  }

  // لسا مش موافق عليه (pending_approval أو rejected)
  if (profile.status !== 'active') {
    if (pathname.startsWith('/pending-approval') || pathname.startsWith('/auth')) {
      return supabaseResponse;
    }
    return NextResponse.redirect(new URL('/pending-approval', request.url));
  }

  // ---------- 3) حساب نشط بالكامل ----------
  // استثناء: صفحة تغيير كلمة السر مسموحة حتى لو الجلسة نشطة
  if (isResetPassword) {
    return supabaseResponse;
  }

  // ما بيحتاج صفحات الدخول ولا صفحة الانتظار
  if (isAuthPage || pathname.startsWith('/pending-approval') || pathname.startsWith('/check-email')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*|favicon.ico).*)'],
};