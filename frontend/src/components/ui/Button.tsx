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
  const base = 'inline-flex items-center justify-center font-bold transition-colors disabled:opacity-35 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-accent text-white rounded-lg hover:bg-accent/90',
    secondary: 'bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-tertiary',
    danger: 'bg-danger text-white rounded-lg hover:bg-danger/90',
    buy: 'bg-rise text-white rounded-lg hover:bg-rise/90',
    sell: 'bg-fall text-white rounded-lg hover:bg-fall/90',
    ghost: 'bg-transparent text-text-tertiary rounded-lg hover:text-text-secondary hover:bg-bg-secondary',
  };

  const sizes = {
    sm: 'h-8 px-3 text-[13px]',
    md: 'h-10 px-4 text-[14px]',
    lg: 'h-12 px-5 text-[15px]',
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
