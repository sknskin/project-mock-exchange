import type { Metadata } from 'next';
import AdminGuard from '@/components/layout/AdminGuard';

export const metadata: Metadata = {
  title: 'Admin - VirtuEx',
  description: 'VirtuEx administration dashboard for system management.',
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGuard>{children}</AdminGuard>;
}
