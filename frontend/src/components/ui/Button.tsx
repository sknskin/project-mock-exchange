/**
 * @file 버튼 컴포넌트
 * @description 다양한 변형(primary, secondary, ghost)을 지원하는 공통 버튼
 *
 * @file Button Component
 * @description Common button with variants: primary, secondary, ghost
 */
'use client';

import { cn } from '@/lib/format';

// 버튼 Props — 네이티브 button 속성 확장 / Button Props — extends native button attributes
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  // 공통 기본 스타일 / Common base styles
  const base = 'inline-flex items-center justify-center font-bold transition-all duration-150 disabled:opacity-35 disabled:cursor-not-allowed';

  // 변형별 색상/배경 스타일 매핑 / Variant-specific color/background style mapping
  const variants = {
    primary: 'bg-accent text-white rounded-lg hover:bg-accent/85 btn-filled',
    secondary: 'bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-tertiary btn-outline',
    danger: 'bg-danger text-white rounded-lg hover:bg-danger/85 btn-filled',
    buy: 'bg-rise text-white rounded-lg hover:bg-rise/85 btn-filled',
    sell: 'bg-fall text-white rounded-lg hover:bg-fall/85 btn-filled',
    ghost: 'bg-transparent text-text-tertiary rounded-lg hover:text-text-secondary hover:bg-bg-secondary btn-ghost',
  };

  // 크기별 높이/패딩/폰트 매핑 / Size-specific height/padding/font mapping
  const sizes = {
    sm: 'h-9 px-4 text-[13px]',
    md: 'h-11 px-5 text-[14px]',
    lg: 'h-[52px] px-6 text-[15px]',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
