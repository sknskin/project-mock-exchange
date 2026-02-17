'use client';

import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/format';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-bg-secondary rounded-t-2xl',
          'max-h-[85vh] overflow-y-auto',
          'animate-slide-up',
        )}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-bg-tertiary rounded-full" />
        </div>
        {title && (
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
