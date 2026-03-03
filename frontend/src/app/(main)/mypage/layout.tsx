import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Page - VirtuEx',
  description:
    'View your profile, trading statistics, notification preferences, and security settings on VirtuEx.',
};

export default function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
