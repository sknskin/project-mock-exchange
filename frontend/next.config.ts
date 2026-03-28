import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// In development, 'unsafe-eval' is needed for Next.js fast refresh.
// In production, it is removed for stronger CSP security.
const scriptSrc = isDev
  ? "'self' 'unsafe-eval' 'unsafe-inline'"
  : "'self' 'unsafe-inline' 'strict-dynamic'";

// 프로덕션에서는 localhost 와일드카드를 제거하여 CSP 강화
// In production, remove localhost wildcard to tighten CSP
const connectSrc = isDev
  ? "'self' ws: wss: http://localhost:* https://api.exchangerate.fun https://api.frankfurter.app"
  : "'self' ws: wss: https://api.exchangerate.fun https://api.frankfurter.app";

const nextConfig: NextConfig = {
  // UX-L-01: 뒤로가기 시 스크롤 위치 복원 — Next.js 실험적 기능
  // UX-L-01: Restore scroll position on back navigation — Next.js experimental feature
  experimental: {
    scrollRestoration: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.simpleicons.org',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: `default-src 'self'; script-src ${scriptSrc} https://t1.daumcdn.net https://*.daumcdn.net; frame-src 'self' https://postcode.map.daum.net http://postcode.map.daum.net https://*.daum.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: blob: https://cdn.simpleicons.org; connect-src ${connectSrc}; font-src 'self' data: https://cdn.jsdelivr.net;` },
          // 브라우저 민감 API 차단 — XSS 시 카메라/마이크/위치 등 악용 방지
          // Block sensitive browser APIs — prevent camera/microphone/geolocation abuse on XSS
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
