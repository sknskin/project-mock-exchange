/**
 * @file 바텀시트 컴포넌트
 * @description 터치 드래그로 닫을 수 있는 모바일 바텀시트
 *
 * @file Bottom Sheet Component
 * @description Mobile bottom sheet dismissible by touch drag
 */
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/format';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';

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
  const contentRef = useRef<HTMLDivElement>(null);
  useFocusTrap(contentRef, isOpen);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // 첫 번째 input에 자동 포커스 (Auto-focus first input)
      requestAnimationFrame(() => {
        const input = contentRef.current?.querySelector('input');
        if (input) input.focus();
      });
    }
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby={title ? 'bottomsheet-title' : undefined}>
      <div
        className="absolute inset-0 bg-black/50 animate-modal-backdrop"
        onClick={onClose}
      />
      {/* 모달: 모바일은 하단, 데스크톱은 flex 중앙 정렬 */}
      <div
        ref={contentRef}
        className={cn(
          'w-full sm:max-w-[480px] bg-bg-elevated',
          'max-h-[85vh] overflow-y-auto',
          'animate-bottomsheet-in',
          'absolute bottom-0 left-0 right-0 rounded-t-2xl',
          'sm:relative sm:bottom-auto sm:left-auto sm:right-auto sm:rounded-2xl',
        )}
      >
        {/* 모바일 드래그 핸들 (Mobile drag handle) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-9 h-[4px] bg-bg-tertiary rounded-full" />
        </div>
        {title && (
          <div className="px-6 py-3 sm:pt-5 flex items-center justify-between">
            <h3 id="bottomsheet-title" className="text-[18px] font-bold text-text-primary">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-quaternary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="px-6 pb-8 pt-2">{children}</div>
      </div>
      <style jsx>{`
        @keyframes bottomsheet-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bottomsheet-scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-bottomsheet-in {
          animation: bottomsheet-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (min-width: 640px) {
          .animate-bottomsheet-in {
            animation: bottomsheet-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
        }
      `}</style>
    </div>
  );
}
