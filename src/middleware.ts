//src\middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // جلب التوكن من الكوكيز
  const token = request.cookies.get('auth-token');
  
  // أضفنا '/dashboard' هنا للسماح لك بالدخول والمعاينة مباشرة
  const publicPaths = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/dashboard' // <--- تم إضافة المسار هنا للمعاينة
  ];

  // التحقق إذا كان المسار الحالي ضمن القائمة العامة
  const isPublicPage = publicPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  // 1. إذا كان المستخدم غير مسجل دخول ويحاول دخول صفحة غير عامة
  if (!token && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ملاحظة: قمنا بتعطيل إعادة التوجيه التلقائي من صفحات الـ Auth إذا كان هناك Token 
  // لضمان عدم حدوث تداخل أثناء فترة المعاينة للمسارات العامة.
  if (token && isPublicPage && request.nextUrl.pathname !== '/dashboard') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};