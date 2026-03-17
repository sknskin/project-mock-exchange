import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// In development, 'unsafe-eval' is needed for Next.js fast refresh.
// In production, it is removed for stronger CSP security.
const scriptSrc = isDev
  ? "'self' 'unsafe-eval' 'unsafe-inline'"
  : "'self' 'unsafe-inline' 'strict-dynamic'";

const nextConfig: NextConfig = {
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
          { key: 'Content-Security-Policy', value: `default-src 'self'; script-src ${scriptSrc} https://t1.daumcdn.net https://*.daumcdn.net; frame-src 'self' https://postcode.map.daum.net http://postcode.map.daum.net https://*.daum.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: blob: https://cdn.simpleicons.org; connect-src 'self' ws: wss: http://localhost:* https://api.exchangerate.fun https://api.frankfurter.app; font-src 'self' data: https://cdn.jsdelivr.net;` },
        ],
      },
    ];
  },
};

export default nextConfig;
