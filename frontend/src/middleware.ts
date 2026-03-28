import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Admin 경로에 보안 헤더 추가 / Add security headers for admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    response.headers.set('Cache-Control', 'no-store, max-age=0');

    // AUTH-M-02: 관리자 경로 접근 시 JWT 쿠키 검증 — 쿠키 없으면 로그인 페이지로 리다이렉트
    // AUTH-M-02: Validate JWT cookie on admin routes — redirect to login if cookie missing
    const accessToken = request.cookies.get('access_token')?.value;
    if (!accessToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
