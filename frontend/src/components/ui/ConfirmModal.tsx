/**
 * @file 확인 모달 컴포넌트
 * @description 확인/취소 버튼이 있는 공통 모달 (취소 버튼은 항상 우측에 배치)
 *
 * @file Confirm Modal Component
 * @description Common modal with confirm/cancel buttons (cancel always on the right)
 */
'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFocusTrap } from '@/hooks/useFocusTrap';

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

export default function ConfirmModal({
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
  useFocusTrap(modalRef, isOpen);

  // ESC 키로 닫기 + 배경 스크롤 방지 / Close on Escape key + lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const confirmBg = confirmVariant === 'danger'
    ? 'bg-danger hover:bg-danger/90'
    : 'bg-accent hover:bg-accent/90';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" ref={modalRef}>
      {/* 오버레이 / Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* 모달 본체 / Modal body */}
      <div className="relative bg-bg-primary border border-border rounded-2xl p-6 w-[min(320px,calc(100vw-2rem))] shadow-2xl">
        <h3 id="confirm-modal-title" className="text-[16px] font-bold text-text-primary text-center">
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
            onClick={onClose}
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
