import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// In development, 'unsafe-eval' is needed for Next.js fast refresh.
// In production, it is removed for stronger CSP security.
const scriptSrc = isDev
  ? "'self' 'unsafe-eval' 'unsafe-inline'"
  : "'self' 'unsafe-inline'";

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
          { key: 'Content-Security-Policy', value: `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://cdn.simpleicons.org; connect-src 'self' ws: wss: http://localhost:* https://api.frankfurter.app; font-src 'self' data:;` },
        ],
      },
    ];
  },
};

export default nextConfig;
