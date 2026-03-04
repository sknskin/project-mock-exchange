import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Announcements - VirtuEx',
  description:
    'Read official announcements, updates, and important notices from the VirtuEx team.',
};

export default function AnnouncementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
