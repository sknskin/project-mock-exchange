/**
 * @file Next.js 미들웨어
 * @description CSP nonce 생성, 보안 헤더, 관리자 인증 검증을 처리하는 미들웨어
 *
 * @file Next.js Middleware
 * @description Middleware handling CSP nonce generation, security headers, and admin auth validation
 *
 * CSP-M-01: 요청마다 고유 nonce를 생성하여 script-src에 적용 — XSS 인라인 스크립트 실행 방지
 * CSP-M-01: Generate a unique nonce per request for script-src — prevents XSS inline script execution
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // CSP-M-01: 요청마다 고유 nonce 생성 / Generate a unique nonce per request
  const nonce = crypto.randomUUID();

  // x-nonce 헤더로 Next.js에 nonce 전달 (Next.js 15 지원)
  // Pass nonce to Next.js via x-nonce header (supported in Next.js 15)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // CSP-M-01: nonce 기반 Content-Security-Policy 헤더 설정
  // CSP-M-01: Set nonce-based Content-Security-Policy header
  // 개발 모드에서 Next.js React Refresh는 eval() 필요
  // Next.js React Refresh requires eval() in development mode
  const isDev = process.env.NODE_ENV === 'development';
  const evalDirective = isDev ? " 'unsafe-eval'" : '';
  // 개발 모드에서 API Gateway(3000)는 다른 포트이므로 명시적 허용 필요
  // In dev, API Gateway(3000) is a different port so explicit allow needed
  const devConnect = isDev ? ' http://localhost:3000 ws://localhost:3000' : '';

  const csp = [
    `default-src 'self'`,
    `script-src 'nonce-${nonce}' 'strict-dynamic'${evalDirective} https://t1.daumcdn.net https://*.daumcdn.net`,
    `frame-src 'self' https://postcode.map.daum.net http://postcode.map.daum.net https://*.daum.net`,
    `style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`,
    `img-src 'self' data: blob: https://cdn.simpleicons.org`,
    `connect-src 'self' ws: wss: https://api.exchangerate.fun https://api.frankfurter.app https://cdn.jsdelivr.net${devConnect}`,
    `font-src 'self' data: https://cdn.jsdelivr.net`,
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

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

// CSP-M-01: 모든 페이지에 CSP 적용 (API 라우트, 정적 파일 제외)
// CSP-M-01: Apply CSP to all pages (exclude API routes and static files)
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|icon\\.svg|.*\\.png$|.*\\.jpg$|.*\\.webp$).*)',
  ],
};
