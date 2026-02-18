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
    'inline-flex items-center justify-center font-bold transition-all duration-150 disabled:opacity-35 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-accent text-white rounded-xl hover:opacity-90 active:opacity-80',
    secondary:
      'bg-bg-secondary text-text-primary rounded-xl hover:bg-bg-tertiary active:bg-bg-tertiary',
    danger: 'bg-danger text-white rounded-xl hover:opacity-90 active:opacity-80',
    buy: 'bg-rise text-white rounded-xl hover:opacity-90 active:opacity-80',
    sell: 'bg-fall text-white rounded-xl hover:opacity-90 active:opacity-80',
    ghost:
      'bg-transparent text-text-tertiary rounded-lg hover:text-text-secondary hover:bg-bg-secondary',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[13px]',
    md: 'px-5 py-2.5 text-[14px]',
    lg: 'px-6 py-3.5 text-[16px]',
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
