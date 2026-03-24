/**
 * @file 인증 토큰 복구 훅
 * @description 페이지 새로고침 후 httpOnly 쿠키로부터 in-memory accessToken을 복구합니다.
 *              sessionStorage에 isAuthenticated만 저장되고 accessToken은 제외되므로,
 *              새로고침 시 refresh 엔드포인트를 호출하여 WebSocket용 토큰을 메모리에 재설정합니다.
 *
 * @file Auth Token Recovery Hook
 * @description Recovers the in-memory accessToken from httpOnly cookies after page reload.
 *              Since accessToken is excluded from sessionStorage persistence (only isAuthenticated is kept),
 *              this hook calls the refresh endpoint on reload to restore the token in Zustand for WebSocket use.
 */
'use client';

import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

// API 기본 URL / API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * 페이지 새로고침 후 in-memory accessToken을 복구하는 훅
 * isAuthenticated가 true이고 accessToken이 null일 때 /api/auth/refresh를 호출합니다.
 * REST API는 쿠키로 인증하므로 영향 없고, WebSocket만 이 토큰을 필요로 합니다.
 *
 * Hook that recovers the in-memory accessToken after page reload.
 * Calls /api/auth/refresh when isAuthenticated is true but accessToken is null.
 * REST API auth works via cookies unaffected; only WebSocket needs this token.
 */
export function useAuthTokenRecovery(): void {
  // 중복 호출 방지 — 한 번만 실행 / Prevent duplicate calls — run only once
  const recoveredRef = useRef(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setToken = useAuthStore((s) => s.setToken);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    // 이미 복구했거나, 미인증 상태이거나, 토큰이 이미 존재하면 스킵
    // Skip if already recovered, unauthenticated, or token already exists
    if (recoveredRef.current || !isAuthenticated || accessToken) return;
    recoveredRef.current = true;

    const recoverToken = async () => {
      try {
        // httpOnly 쿠키로 refresh 호출 — 새 accessToken을 응답 바디로 수신
        // Call refresh with httpOnly cookie — receive new accessToken in response body
        const { data } = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true, timeout: 10000 },
        );

        const newToken = data.data?.accessToken ?? data.accessToken;
        if (newToken) {
          setToken(newToken);
        }
      } catch {
        // 리프레시 실패 — 쿠키 만료 등 → 로그아웃 처리
        // Refresh failed — expired cookie, etc. → force logout
        logout();
        if (typeof window !== 'undefined') {
          window.location.replace('/login');
        }
      }
    };

    recoverToken();
  }, [isAuthenticated, accessToken, setToken, logout]);
}
