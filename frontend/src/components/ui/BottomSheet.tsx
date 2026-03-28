/**
 * @file 바텀시트 컴포넌트
 * @description 터치 드래그로 닫을 수 있는 모바일 바텀시트
 *
 * @file Bottom Sheet Component
 * @description Mobile bottom sheet dismissible by touch drag
 */
'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/format';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';

// ANI-L-01: 닫기 애니메이션 지속시간 (ms)
// ANI-L-01: Close animation duration (ms)
const CLOSE_ANIMATION_DURATION = 200;

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

  // ANI-L-01: 닫기 애니메이션 상태 — 닫힘 요청 시 애니메이션 후 실제 언마운트
  // ANI-L-01: Close animation state — animate before actual unmount on close request
  const [closing, setClosing] = useState(false);
  const [visible, setVisible] = useState(false);

  useFocusTrap(contentRef, isOpen && !closing);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
    }
  }, [isOpen]);

  /** ANI-L-01: 닫기 애니메이션 트리거 후 onClose 호출
   * ANI-L-01: Trigger close animation then call onClose */
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setVisible(false);
      onClose();
    }, CLOSE_ANIMATION_DURATION);
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    },
    [handleClose],
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

  if (!isOpen && !visible) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby={title ? 'bottomsheet-title' : undefined}>
      {/* ANI-L-01: 백드롭 — 닫기 시 페이드아웃 / Backdrop — fade-out on close */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50',
          closing ? 'animate-backdrop-out' : 'animate-modal-backdrop',
        )}
        onClick={handleClose}
      />
      {/* 모달: 모바일은 하단, 데스크톱은 flex 중앙 정렬 */}
      <div
        ref={contentRef}
        className={cn(
          'w-full sm:max-w-[480px] bg-bg-elevated',
          'max-h-[85vh] overflow-y-auto',
          // ANI-L-01: 열림/닫힘 애니메이션 분기 / Open/close animation branching
          closing ? 'animate-bottomsheet-out' : 'animate-bottomsheet-in',
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
            {/* MOB-L-03: 닫기 버튼 최소 터치 타겟 44px 보장 / Ensure 44px min touch target for close button */}
            <button
              onClick={handleClose}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text-quaternary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
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
        /* ANI-L-01: 닫기 애니메이션 — opacity + translateY / Close animation — opacity + translateY */
        @keyframes bottomsheet-slide-down {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(20px); }
        }
        @keyframes bottomsheet-scale-out {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.95); }
        }
        @keyframes backdrop-fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .animate-bottomsheet-in {
          animation: bottomsheet-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-bottomsheet-out {
          animation: bottomsheet-slide-down 0.2s ease-in both;
        }
        .animate-backdrop-out {
          animation: backdrop-fade-out 0.2s ease-in both;
        }
        @media (min-width: 640px) {
          .animate-bottomsheet-in {
            animation: bottomsheet-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          .animate-bottomsheet-out {
            animation: bottomsheet-scale-out 0.2s ease-in both;
          }
        }
      `}</style>
    </div>
  );
}
