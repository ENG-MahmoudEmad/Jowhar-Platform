import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const authPaths = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
];

const previewPublicPaths = [
  '/dashboard',
  '/my-tasks',
  '/archive',
  '/news',
  '/settings',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token');

  const isAuthPage = authPaths.some(path => pathname.startsWith(path));
  const isPreviewPublicPage = previewPublicPaths.some(path => pathname.startsWith(path));

  if (!token && !isAuthPage && !isPreviewPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
