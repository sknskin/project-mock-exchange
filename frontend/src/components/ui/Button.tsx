'use client';

import { cn } from '@/lib/format';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'buy' | 'sell' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
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
  const baseStyles =
    'inline-flex items-center justify-center font-bold transition-all duration-200 disabled:opacity-35 disabled:cursor-not-allowed active:scale-[0.97]';

  const variants = {
    primary:
      'bg-accent text-white rounded-xl shadow-[0_2px_8px_rgba(49,130,246,0.25)] hover:shadow-[0_4px_16px_rgba(49,130,246,0.35)] hover:brightness-110',
    secondary:
      'bg-bg-secondary text-text-primary rounded-xl border border-white/[0.06] hover:bg-bg-tertiary hover:border-white/[0.1]',
    danger:
      'bg-danger text-white rounded-xl shadow-[0_2px_8px_rgba(240,68,82,0.25)] hover:brightness-110',
    buy:
      'bg-rise text-white rounded-xl shadow-[0_2px_8px_rgba(240,68,82,0.25)] hover:brightness-110',
    sell:
      'bg-fall text-white rounded-xl shadow-[0_2px_8px_rgba(49,130,246,0.25)] hover:brightness-110',
    ghost:
      'bg-transparent text-text-tertiary rounded-lg hover:text-text-secondary hover:bg-bg-secondary',
  };

  const sizes = {
    sm: 'h-8 px-3.5 text-[13px]',
    md: 'h-11 px-5 text-[14px]',
    lg: 'h-[52px] px-6 text-[15px] rounded-2xl',
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
