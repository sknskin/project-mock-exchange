/**
 * @file 인증 토큰 복구 컴포넌트
 * @description 페이지 새로고침 후 WebSocket용 in-memory accessToken을 자동으로 복구합니다.
 *              레이아웃에 마운트되어 인증된 사용자의 토큰을 항상 보장합니다.
 *
 * @file Auth Token Recovery Component
 * @description Automatically recovers the in-memory accessToken for WebSocket after page reload.
 *              Mounted in the layout to ensure authenticated users always have a token available.
 */
'use client';

import { useAuthTokenRecovery } from '@/hooks/useAuthTokenRecovery';

/**
 * 렌더링 없이 토큰 복구만 수행하는 컴포넌트
 * 레이아웃에 포함하여 새로고침 후 WebSocket 인증이 끊기지 않도록 합니다.
 *
 * Render-less component that only performs token recovery.
 * Include in layout to prevent WebSocket auth from breaking after page reload.
 */
export default function AuthTokenRecovery(): null {
  useAuthTokenRecovery();
  return null;
}
