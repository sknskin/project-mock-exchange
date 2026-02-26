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
import Footer from '@/components/layout/Footer';
import ThemeProvider from '@/components/layout/ThemeProvider';
import PageViewTracker from '@/components/layout/PageViewTracker';
import ToastContainer from '@/components/ui/ToastContainer';
import LiveToastContainer from '@/components/ui/LiveToastContainer';
import ConnectionGuard from '@/components/layout/ConnectionGuard';
import ChatPanel from '@/components/chat/ChatPanel';
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
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* React보다 먼저 실행: localStorage에서 인증 상태를 읽어 CSS 속성으로 설정 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var d=JSON.parse(localStorage.getItem('virtuex-auth')||'{}');if(d.state&&d.state.isAuthenticated){var h=document.documentElement.dataset;h.authed='1';if(d.state.user){if(d.state.user.role)h.role=d.state.user.role;if(d.state.user.username)h.username=d.state.user.username}}}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-bg-primary text-text-primary min-h-screen">
        <QueryProvider>
          <ConnectionGuard>
            <ThemeProvider />
            <PageViewTracker />
            <Header />
            <MainContent>
              {children}
            </MainContent>
            <Footer />
            <BottomNav />
            <ToastContainer />
            <LiveToastContainer />
            <ChatPanel />
          </ConnectionGuard>
        </QueryProvider>
      </body>
    </html>
  );
}
