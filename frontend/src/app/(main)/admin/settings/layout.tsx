import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Settings - VirtuEx Admin',
  description:
    'Manage trading limits, fees, system status, market hours, risk management, and security settings.',
};

export default function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
