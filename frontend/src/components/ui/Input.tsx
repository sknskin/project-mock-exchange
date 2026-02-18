/**
 * @file 입력 컴포넌트
 * @description 라벨, 에러 메시지, 아이콘을 지원하는 공통 입력 필드
 *
 * @file Input Component
 * @description Common input field with label, error message, and icon support
 */
'use client';

import { cn } from '@/lib/format';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[13px] text-text-secondary font-semibold mb-2">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full h-12 px-4 bg-bg-secondary border border-border/60 rounded-xl text-text-primary placeholder-text-quaternary',
          'focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40',
          'transition-all duration-150 text-[15px] font-medium',
          error && 'ring-2 ring-danger/20 border-danger/40',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  );
}
