/**
 * @file 비동기 버튼 컴포넌트
 * @description 비동기 작업 중 로딩 스피너를 표시하는 버튼 래퍼
 *
 * @file Async Button Component
 * @description Button wrapper that displays a loading spinner during async operations
 */
'use client';

import Button from '@/components/ui/Button';
import { cn } from '@/lib/format';

// LD-M-02: 비동기 버튼 Props — Button Props 확장 / Async button Props — extends Button Props
interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 로딩 상태
   * Loading state */
  isPending: boolean;
  /** 스타일 변형
   * Style variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'buy' | 'sell' | 'ghost';
  /** 크기
   * Size */
  size?: 'sm' | 'md' | 'lg';
  /** 전체 너비 확장 여부
   * Whether to expand to full width */
  fullWidth?: boolean;
}

/** LD-M-02: 비동기 버튼 — isPending 시 스피너 표시 및 비활성화
 * LD-M-02: Async button — shows spinner and disables when isPending */
export default function AsyncButton({
  isPending,
  children,
  disabled,
  className,
  ...props
}: AsyncButtonProps) {
  return (
    <Button
      disabled={isPending || disabled}
      className={cn(isPending && 'relative', className)}
      {...props}
    >
      {isPending && (
        // LD-M-02: 로딩 스피너 — 버튼 텍스트 위에 오버레이
        // LD-M-02: Loading spinner — overlay on button text
        <span className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-4 h-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </span>
      )}
      <span className={isPending ? 'invisible' : undefined}>{children}</span>
    </Button>
  );
}
