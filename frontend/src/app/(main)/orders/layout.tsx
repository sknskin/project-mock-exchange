import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Orders - VirtuEx',
  description:
    'Manage your open orders, view trade history, and analyze trading performance on VirtuEx.',
};

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
