import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'News - VirtuEx',
  description:
    'Stay updated with the latest financial news, market analysis, and crypto updates on VirtuEx.',
};

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
