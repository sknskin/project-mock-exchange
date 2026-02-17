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
    'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-accent text-white hover:bg-blue-600 active:bg-blue-700',
    secondary:
      'bg-bg-tertiary text-text-primary hover:bg-border active:bg-border',
    danger: 'bg-danger text-white hover:bg-red-600 active:bg-red-700',
    buy: 'bg-rise text-white hover:opacity-90 active:opacity-80',
    sell: 'bg-fall text-white hover:opacity-90 active:opacity-80',
    ghost:
      'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
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
