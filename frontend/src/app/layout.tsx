/**
 * @file 루트 레이아웃
 * @description Header, Footer, BottomNav, 테마 등을 포함하는 전역 레이아웃
 *
 * @file Root Layout
 * @description Global layout including Header, Footer, BottomNav, and theme
 */
import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/components/layout/QueryProvider';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import FloatingActions from '@/components/layout/FloatingActions';
import Footer from '@/components/layout/Footer';
import ThemeProvider from '@/components/layout/ThemeProvider';
import PageViewTracker from '@/components/layout/PageViewTracker';

export const metadata: Metadata = {
  title: 'VirtuEx - 모의투자',
  description: '실시간 모의 주식/암호화폐 거래 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="bg-bg-primary text-text-primary min-h-screen">
        <QueryProvider>
          <ThemeProvider />
          <PageViewTracker />
          <Header />
          <main className="pb-20 md:pb-0 max-w-[1080px] mx-auto px-5 sm:px-8 lg:px-10">
            {children}
          </main>
          <Footer />
          <BottomNav />
          <FloatingActions />
        </QueryProvider>
      </body>
    </html>
  );
}
