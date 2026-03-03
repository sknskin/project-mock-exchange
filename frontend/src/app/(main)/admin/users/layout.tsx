import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Management - VirtuEx Admin',
  description:
    'Manage platform users — view profiles, approve registrations, and update user roles.',
};

export default function AdminUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
