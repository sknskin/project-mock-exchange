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
          'w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-text-primary placeholder-text-quaternary',
          'focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30',
          'transition-all duration-150 text-[15px] font-medium',
          error && 'ring-1 ring-danger/30 border-danger/30',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  );
}
