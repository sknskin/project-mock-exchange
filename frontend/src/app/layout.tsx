import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/components/layout/QueryProvider';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

export const metadata: Metadata = {
  title: 'MockX - 모의투자',
  description: '실시간 모의 주식/암호화폐 거래 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-bg-primary text-text-primary min-h-screen">
        <QueryProvider>
          <Header />
          <main className="pb-16 md:pb-0 max-w-[1280px] mx-auto">
            {children}
          </main>
          <BottomNav />
        </QueryProvider>
      </body>
    </html>
  );
}
