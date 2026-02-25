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
      {/* 모달 컨테이너: 화면 중앙에 표시, 모바일에서는 하단 시트 */}
      <div
        className={cn(
          'absolute w-full sm:max-w-[480px] bg-bg-elevated',
          'max-h-[85vh] overflow-y-auto',
          'animate-modal-in',
          'bottom-0 left-0 right-0 rounded-t-2xl',
          'sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
        )}
      >
        {/* 모바일 드래그 핸들 (Mobile drag handle) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-9 h-[4px] bg-bg-tertiary rounded-full" />
        </div>
        {title && (
          <div className="px-6 py-3 sm:pt-5">
            <h3 className="text-[18px] font-bold text-text-primary">{title}</h3>
          </div>
        )}
        <div className="px-6 pb-8 pt-2">{children}</div>
      </div>
      <style jsx>{`
        @keyframes modal-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (min-width: 640px) {
          @keyframes modal-in {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
        }
        .animate-modal-in {
          animation: modal-in 0.2s ease-out both;
        }
      `}</style>
    </div>
  );
}
