import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Statistics - VirtuEx Admin',
  description:
    'View platform-wide trading statistics, user metrics, and performance analytics.',
};

export default function AdminStatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
