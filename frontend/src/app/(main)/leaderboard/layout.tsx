import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard - VirtuEx',
  description:
    'View top trader rankings by return rate, absolute P&L, and total assets on VirtuEx.',
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
