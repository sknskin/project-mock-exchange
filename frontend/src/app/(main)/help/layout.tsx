import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help - VirtuEx',
  description:
    'Get help with trading, account management, deposits, withdrawals, and platform features on VirtuEx.',
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
