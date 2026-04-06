/**
 * @file 세션 가드 컴포넌트
 * @description 로그인 세션 만료 감시 + 연장 모달 표시를 담당하는 클라이언트 래퍼
 *
 * @file Session Guard Component
 * @description Client wrapper handling session expiry monitoring + extension modal display
 */
'use client';

import { useSessionTimer } from '@/hooks/useSessionTimer';
import SessionExtendModal from '@/components/ui/SessionExtendModal';

export default function SessionGuard() {
  const {
    remainingSeconds,
    showModal,
    extendSession,
    handleLogout,
  } = useSessionTimer();

  return (
    <SessionExtendModal
      isOpen={showModal}
      remainingSeconds={remainingSeconds}
      onExtend={extendSession}
      onLogout={handleLogout}
    />
  );
}
