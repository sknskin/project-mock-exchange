import type { NextConfig } from 'next';

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
          // CSP-M-01: CSP는 미들웨어에서 nonce 기반으로 동적 설정됨 (middleware.ts 참고)
          // CSP-M-01: CSP is dynamically set with nonce in middleware (see middleware.ts)
          // 브라우저 민감 API 차단 — XSS 시 카메라/마이크/위치 등 악용 방지
          // Block sensitive browser APIs — prevent camera/microphone/geolocation abuse on XSS
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
