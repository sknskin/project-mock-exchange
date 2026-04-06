/**
 * @file 세션 연장 모달 컴포넌트
 * @description 로그인 세션 만료 임박 시 연장/로그아웃을 선택하는 모달
 *
 * @file Session Extend Modal Component
 * @description Modal prompting user to extend or end session when expiry is near
 */
'use client';

import { memo, useEffect, useRef, useState, useCallback, useId } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';
import { cn } from '@/lib/format';

// 닫기 애니메이션 지속시간 (ms)
// Close animation duration (ms)
const CLOSE_ANIMATION_DURATION = 200;

interface SessionExtendModalProps {
  isOpen: boolean;
  remainingSeconds: number | null;
  onExtend: () => void;
  onLogout: () => void;
}

/** 남은 시간을 MM:SS 형식으로 변환
 * Format remaining seconds as MM:SS */
function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function SessionExtendModal({
  isOpen,
  remainingSeconds,
  onExtend,
  onLogout,
}: SessionExtendModalProps) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

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

  const handleExtend = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setVisible(false);
      onExtend();
    }, CLOSE_ANIMATION_DURATION);
  }, [onExtend]);

  const handleLogout = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setVisible(false);
      onLogout();
    }, CLOSE_ANIMATION_DURATION);
  }, [onLogout]);

  // ESC 키로 연장 처리 (실수로 닫히면 안 되므로 연장으로 처리)
  // ESC key extends session (prevent accidental logout)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleExtend();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [isOpen, handleExtend]);

  if (!isOpen && !visible) return null;

  // 1분 이하일 때 긴급 스타일 적용
  // Apply urgent style when under 1 minute
  const isUrgent = (remainingSeconds ?? 0) <= 60;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" role="alertdialog" aria-modal="true" aria-labelledby={titleId} ref={modalRef}>
      <div className={cn('absolute inset-0 bg-black/60', closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop')} />

      <div className={cn(
        'relative bg-bg-primary border rounded-2xl p-6 w-[min(360px,calc(100vw-2rem))] shadow-2xl',
        closing ? 'animate-modal-content-out' : 'animate-modal-content',
        isUrgent ? 'border-danger' : 'border-border',
      )}>
        {/* 아이콘 */}
        <div className="flex justify-center mb-3">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            isUrgent ? 'bg-danger/10' : 'bg-warning/10',
          )}>
            <svg className={cn('w-6 h-6', isUrgent ? 'text-danger' : 'text-warning')} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        </div>

        <h3 id={titleId} className="text-[16px] font-bold text-text-primary text-center">
          {t('session.extendTitle')}
        </h3>

        {/* 남은 시간 표시 / Remaining time display */}
        <div className={cn(
          'text-center mt-3 text-[28px] font-mono font-bold tabular-nums',
          isUrgent ? 'text-danger' : 'text-warning',
        )}>
          {remainingSeconds !== null ? formatTime(remainingSeconds) : '--:--'}
        </div>

        <p className="text-[13px] text-text-secondary text-center mt-2">
          {t('session.extendMessage')}
        </p>

        {/* 버튼: 연장(좌) + 로그아웃(우) / Buttons: extend(left) + logout(right) */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={handleExtend}
            className="flex-1 h-11 rounded-xl bg-accent hover:bg-accent/90 text-white text-[14px] font-semibold transition-colors"
          >
            {t('session.extend')}
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 h-11 rounded-xl border border-border text-[14px] font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
          >
            {t('session.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(SessionExtendModal);
