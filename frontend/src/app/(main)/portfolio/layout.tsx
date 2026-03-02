import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio - VirtuEx',
  description:
    'View your portfolio balance, holdings, investment weight, and analytics on VirtuEx.',
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
