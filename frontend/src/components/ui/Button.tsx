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
    'inline-flex items-center justify-center font-bold transition-all duration-150 disabled:opacity-35 disabled:cursor-not-allowed active:scale-[0.98]';

  const variants = {
    primary: 'bg-accent text-white rounded-xl hover:brightness-110 active:brightness-90',
    secondary:
      'bg-bg-secondary text-text-primary rounded-xl hover:bg-bg-tertiary active:bg-bg-tertiary border border-border/50',
    danger: 'bg-danger text-white rounded-xl hover:brightness-110 active:brightness-90',
    buy: 'bg-rise text-white rounded-xl hover:brightness-110 active:brightness-90',
    sell: 'bg-fall text-white rounded-xl hover:brightness-110 active:brightness-90',
    ghost:
      'bg-transparent text-text-tertiary rounded-lg hover:text-text-secondary hover:bg-bg-secondary',
  };

  const sizes = {
    sm: 'h-8 px-3.5 text-[13px]',
    md: 'h-10 px-5 text-[14px]',
    lg: 'h-12 px-6 text-[15px]',
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
