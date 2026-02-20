/**
 * @file 인증 가드 컴포넌트
 * @description 비인증 사용자에게 로그인 필요 모달을 표시합니다
 *
 * @file Auth Guard Component
 * @description Shows login required modal for unauthenticated users
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(true);

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
