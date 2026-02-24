/**
 * @file 바텀시트 컴포넌트
 * @description 터치 드래그로 닫을 수 있는 모바일 바텀시트
 *
 * @file Bottom Sheet Component
 * @description Mobile bottom sheet dismissible by touch drag
 */
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
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* 바텀시트 컨테이너: 데스크탑에서 최대 너비 제한, 모바일에서는 전체 너비 */}
      <div
        className={cn(
          'absolute bottom-0 left-1/2 -translate-x-1/2 w-full sm:max-w-[480px] bg-bg-elevated rounded-t-2xl',
          'max-h-[85vh] overflow-y-auto',
          'animate-slide-up',
        )}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-[4px] bg-bg-tertiary rounded-full" />
        </div>
        {title && (
          <div className="px-6 py-3">
            <h3 className="text-[18px] font-bold text-text-primary">{title}</h3>
          </div>
        )}
        <div className="px-6 pb-8 pt-2">{children}</div>
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
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
