/**
 * @file 로그인 필요 모달 컴포넌트
 * @description 비로그인 사용자에게 로그인이 필요함을 알리는 공통 모달
 *
 * @file Login Required Modal Component
 * @description Common modal that prompts non-authenticated users to log in
 */
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { LogIn } from 'lucide-react';

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 커스텀 메시지 (없으면 기본 메시지 사용) / Custom message (uses default if not provided) */
  message?: string;
}

/** 로그인 필요 모달 — 로그인 버튼 클릭 시 /login 으로 이동
 * Login required modal — navigates to /login on button click */
export default function LoginRequiredModal({
  isOpen,
  onClose,
  message,
}: LoginRequiredModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
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

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-modal-title"
      ref={modalRef}
    >
      {/* 오버레이 / Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* 모달 본체 / Modal body */}
      <div className="relative bg-bg-primary border border-border rounded-2xl p-6 w-[min(360px,calc(100vw-2rem))] shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
            <LogIn className="w-6 h-6 text-accent" />
          </div>
        </div>
        <h3
          id="login-required-modal-title"
          className="text-[16px] font-bold text-text-primary text-center"
        >
          {t('community.loginRequired')}
        </h3>
        <p className="text-[14px] text-text-secondary text-center mt-3 whitespace-pre-line">
          {message || t('community.loginRequiredDesc')}
        </p>

        {/* 버튼: 로그인(좌) + 닫기(우) / Buttons: login(left) + close(right) */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              onClose();
              router.push('/login');
            }}
            className="flex-1 h-11 rounded-xl bg-accent text-white text-[14px] font-semibold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {t('nav.login')}
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-border text-[14px] font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
          >
            {t('modal.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
