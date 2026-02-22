/**
 * @file 인증 가드 컴포넌트
 * @description 비인증 사용자에게 로그인 필요 모달을 표시합니다
 *              SSR hydration 안전: 첫 렌더에서는 빈 영역 표시, mount 후 인증 체크
 *
 * @file Auth Guard Component
 * @description Shows login required modal for unauthenticated users
 *              SSR-safe: renders placeholder on first render, checks auth after mount
 */
'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import ConfirmModal from '@/components/ui/ConfirmModal';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(true);

  // SSR 안전: 첫 렌더에서 hydration 불일치 방지, paint 전에 true로 설정
  // SSR-safe: prevents hydration mismatch, set true before paint via useLayoutEffect
  const [mounted, setMounted] = useState(false);
  useIsomorphicLayoutEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div className="min-h-[50vh]" />;
  }

  // 인라인 스크립트가 localStorage에서 인증 상태를 감지했으나 Zustand가 아직 rehydrate되지 않은 경우
  // 잠시 placeholder를 표시하여 로그인 모달 깜빡임 방지
  // If inline script detected auth but Zustand hasn't rehydrated yet, show placeholder
  if (!isAuthenticated) {
    const browserHasAuth = typeof document !== 'undefined'
      && document.documentElement.dataset.authed === '1';
    if (browserHasAuth) {
      return <div className="min-h-[50vh]" />;
    }
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-text-quaternary text-[14px]">{t('modal.loginRequired')}</p>
        </div>
        <ConfirmModal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); router.replace('/dashboard'); }}
          onConfirm={() => { setModalOpen(false); router.replace('/login'); }}
          title={t('modal.loginRequired')}
          message={t('modal.loginRequiredMessage')}
          confirmLabel={t('modal.loginConfirm')}
        />
      </>
    );
  }

  return <>{children}</>;
}
