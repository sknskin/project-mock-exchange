'use client';

import { cn } from '@/lib/format';

const roleStyles: Record<string, string> = {
  ADMIN: 'bg-accent/15 text-accent',
  SYSTEM: 'bg-purple-500/15 text-purple-400',
  USER: 'bg-bg-tertiary text-text-secondary',
};

interface RoleBadgeProps {
  role: string;
  label?: string;
}

export default function RoleBadge({ role, label }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold',
        roleStyles[role] ?? 'bg-bg-tertiary text-text-secondary',
      )}
    >
      {label ?? role}
    </span>
  );
}
