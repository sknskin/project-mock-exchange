import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - VirtuEx',
  description:
    'Real-time market dashboard with live prices, trending assets, and period-based performance charts.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
