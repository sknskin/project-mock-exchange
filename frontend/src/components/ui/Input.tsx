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
        <label className="block text-sm text-text-secondary mb-2">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full px-4 py-3.5 bg-bg-tertiary border border-border rounded-xl text-text-primary placeholder-text-tertiary',
          'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
          'transition-colors duration-200 text-base',
          error && 'border-danger focus:border-danger focus:ring-danger',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}
