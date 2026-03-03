import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Audit Log - VirtuEx Admin',
  description:
    'Review platform audit logs, admin actions, and security events.',
};

export default function AdminAuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
