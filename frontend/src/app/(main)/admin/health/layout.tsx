import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Service Health - VirtuEx Admin',
  description:
    'Monitor microservice health, uptime, response times, and system dependencies.',
};

export default function AdminHealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
