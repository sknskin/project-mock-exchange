/**
 * @file 역할 배지 컴포넌트
 * @description 사용자 역할(ADMIN, SYSTEM, USER)을 색상 배지로 표시
 *
 * @file Role Badge Component
 * @description Displays user role (ADMIN, SYSTEM, USER) as a colored badge
 */
'use client';

import { cn } from '@/lib/format';

// 역할별 스타일 매핑 / Role-specific style mapping
const roleStyles: Record<string, string> = {
  ADMIN: 'bg-accent/15 text-accent',
  SYSTEM: 'bg-purple-500/15 text-purple-400',
  USER: 'bg-bg-tertiary text-text-secondary',
};

interface RoleBadgeProps {
  role: string;
  label?: string;
}

/** 역할 배지 렌더링
 * Render role badge */
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
