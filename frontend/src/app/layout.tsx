/**
 * @file 루트 레이아웃
 * @description Header, Footer, BottomNav, 테마 등을 포함하는 전역 레이아웃
 *
 * @file Root Layout
 * @description Global layout including Header, Footer, BottomNav, and theme
 */
import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import QueryProvider from '@/components/layout/QueryProvider';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import ThemeProvider from '@/components/layout/ThemeProvider';
import PageViewTracker from '@/components/layout/PageViewTracker';
import ScrollToTop from '@/components/layout/ScrollToTop';
import ToastContainer from '@/components/ui/ToastContainer';
import LiveToastContainer from '@/components/ui/LiveToastContainer';
import ConnectionGuard from '@/components/layout/ConnectionGuard';
import AuthenticatedChatPanel from '@/components/chat/AuthenticatedChatPanel';
import AuthTokenRecovery from '@/components/layout/AuthTokenRecovery';
import MainContent from '@/components/layout/MainContent';

export const metadata: Metadata = {
  title: 'VirtuEx - Mock Trading Platform',
  description: 'Real-time mock stock & crypto trading platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* CDN 폰트 FOIT 방지: preconnect로 DNS/TLS 사전 연결 / Prevent FOIT with preconnect */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* IMG-L-01: CDN 폰트 스타일시트 프리로드 — 렌더링 차단 최소화 / CDN font stylesheet preload — minimize render blocking */}
        <link rel="preload" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" as="style" />
        {/*
          SSR Hydration Flicker 방지: React 렌더링 전에 sessionStorage에서 인증 상태를 읽어
          CSS data 속성을 설정합니다. auth-show/auth-hide CSS 클래스가 즉시 동작합니다.
          보안: 이 스크립트는 빌드 타임 고정 문자열이며, sessionStorage 읽기 + dataset 설정만 수행합니다.

          Prevents SSR hydration flicker: reads auth state from sessionStorage before React renders
          and sets CSS data attributes. auth-show/auth-hide CSS classes work immediately.
          Security: this is a build-time fixed string that only reads sessionStorage + sets dataset.
        */}
        <Script
          id="auth-prehydrate"
          strategy="beforeInteractive"
        >{`
          try {
            var d = JSON.parse(sessionStorage.getItem('virtuex-auth') || '{}');
            if (d.state && d.state.isAuthenticated) {
              var h = document.documentElement.dataset;
              h.authed = '1';
              if (d.state.user && d.state.user.role) h.role = d.state.user.role;
            }
          } catch (e) {}
          try {
            var s = JSON.parse(localStorage.getItem('virtuex-settings') || '{}');
            if (s.state && s.state.locale) {
              document.documentElement.lang = s.state.locale;
            }
          } catch (e) {}
          if (!document.documentElement.lang || document.documentElement.lang === 'en') document.documentElement.lang = 'ko';
        `}</Script>
      </head>
      <body className="bg-bg-primary text-text-primary min-h-screen">
        {/* 키보드/스크린 리더 사용자를 위한 본문 건너뛰기 링크 (WCAG 2.4.1)
            Skip to content link for keyboard/screen reader users (WCAG 2.4.1) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:bg-bg-primary focus:text-text-primary focus:px-4 focus:py-2 focus:rounded-lg focus:ring-2 focus:ring-accent"
          data-i18n-skip
        >
          본문으로 건너뛰기
        </a>
        <QueryProvider>
          <ConnectionGuard>
            <AuthTokenRecovery />
            <ThemeProvider />
            <PageViewTracker />
            <ScrollToTop />
            <Header />
            <MainContent>
              {children}
            </MainContent>
            <Footer />
            <BottomNav />
            <ToastContainer />
            <LiveToastContainer />
            <AuthenticatedChatPanel />
          </ConnectionGuard>
        </QueryProvider>
      </body>
    </html>
  );
}
