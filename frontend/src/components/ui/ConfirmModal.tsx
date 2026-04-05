/**
 * @file 확인 모달 컴포넌트
 * @description 확인/취소 버튼이 있는 공통 모달 (취소 버튼은 항상 우측에 배치)
 *
 * @file Confirm Modal Component
 * @description Common modal with confirm/cancel buttons (cancel always on the right)
 */
'use client';

import { memo, useEffect, useRef, useState, useCallback, useId } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';
import { cn } from '@/lib/format';

// ANI-M-04: 닫기 애니메이션 지속시간 (ms)
// ANI-M-04: Close animation duration (ms)
const CLOSE_ANIMATION_DURATION = 200;

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
}

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'primary',
  loading = false,
}: ConfirmModalProps) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);

  // A11Y: 고유 ID 생성 — aria-labelledby 연결에 사용
  // A11Y: Generate unique ID — used for aria-labelledby linking
  const titleId = useId();

  // ANI-M-04: 닫기 애니메이션 상태 / Close animation state
  const [closing, setClosing] = useState(false);
  const [visible, setVisible] = useState(false);

  useFocusTrap(modalRef, isOpen && !closing);
  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
    }
  }, [isOpen]);

  // ANI-M-04: 닫기 애니메이션 트리거 후 onClose 호출
  // ANI-M-04: Trigger close animation then call onClose
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setVisible(false);
      onClose();
    }, CLOSE_ANIMATION_DURATION);
  }, [onClose]);

  // ESC 키로 닫기 / Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [isOpen, handleClose]);

  if (!isOpen && !visible) return null;

  const confirmBg = confirmVariant === 'danger'
    ? 'bg-danger hover:bg-danger/90'
    : 'bg-accent hover:bg-accent/90';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={modalRef}>
      {/* ANI-M-04: 오버레이 — 닫기 시 페이드아웃 / Overlay — fade-out on close */}
      <div className={cn('absolute inset-0 bg-black/60', closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop')} onClick={handleClose} />

      {/* ANI-M-04: 모달 본체 — 열림/닫힘 애니메이션 / Modal body — open/close animation */}
      <div className={cn('relative bg-bg-primary border border-border rounded-2xl p-6 w-[min(320px,calc(100vw-2rem))] shadow-2xl', closing ? 'animate-modal-content-out' : 'animate-modal-content')}>
        <h3 id={titleId} className="text-[16px] font-bold text-text-primary text-center">
          {title}
        </h3>
        <p className="text-[14px] text-text-secondary text-center mt-3 whitespace-pre-line">
          {message}
        </p>

        {/* 버튼: 확인(좌) + 취소(우) / Buttons: confirm(left) + cancel(right) */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 h-11 rounded-xl text-white text-[14px] font-semibold transition-colors ${confirmBg} disabled:opacity-50`}
          >
            {loading ? '...' : (confirmLabel || t('modal.confirm'))}
          </button>
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 h-11 rounded-xl border border-border text-[14px] font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
          >
            {cancelLabel || t('modal.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ConfirmModal);
