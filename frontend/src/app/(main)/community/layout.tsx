import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community - VirtuEx',
  description:
    'Join the VirtuEx trading community — share strategies, discuss markets, and connect with fellow traders.',
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
