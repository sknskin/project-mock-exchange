/**
 * @file 세션 타이머 훅
 * @description 로그인 세션 만료 카운트다운 + 연장 모달 트리거
 *
 * @file Session Timer Hook
 * @description Login session expiry countdown + extension modal trigger
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';

// 연장 모달을 표시할 잔여 시간 임계값 (초)
// Remaining time thresholds to show extension modal (seconds)
const WARN_THRESHOLDS = [10 * 60, 5 * 60, 1 * 60];

export function useSessionTimer() {
  const { isAuthenticated, sessionExpiresAt, sessionDuration, setSession, logout, user } = useAuthStore();
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  // 이미 표시한 임계값 기록 — 같은 임계값에서 모달 중복 표시 방지
  // Track already-shown thresholds — prevent duplicate modals at same threshold
  const shownThresholds = useRef<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 로그아웃 중복 호출 방지 플래그
  // Guard against concurrent logout calls on slow networks
  const isLoggingOut = useRef(false);

  // 타이머 초기화 — 로그인/연장 시 표시 기록 리셋
  // Reset shown thresholds on login/extension
  const resetThresholds = useCallback(() => {
    shownThresholds.current.clear();
  }, []);

  // 세션 연장 — refresh API 호출 후 타이머 리셋
  // Extend session — call refresh API then reset timer
  const extendSession = useCallback(async () => {
    try {
      const res = await api.post('/api/auth/refresh');
      const accessToken = res.data?.data?.accessToken ?? res.data?.accessToken;
      if (accessToken) {
        useAuthStore.getState().setToken(accessToken);
      }
      const role = user?.role || 'USER';
      setSession(role);
      resetThresholds();
      setShowModal(false);
    } catch {
      // 갱신 실패 시 로그아웃
      // Logout on refresh failure
      logout();
    }
  }, [user?.role, setSession, resetThresholds, logout]);

  // 로그아웃 처리 — 중복 호출 방지
  // Handle logout — guard against concurrent calls
  const handleLogout = useCallback(async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;
    setShowModal(false);
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      // 로그아웃 API 실패해도 로컬 상태는 정리 — 네트워크 오류 등 허용
      // Clear local state even if logout API fails — tolerate network errors etc.
      console.warn('[SessionTimer] Logout API failed, clearing local state:', error);
    }
    logout();
    isLoggingOut.current = false;
  }, [logout]);

  useEffect(() => {
    // 미인증 또는 만료 시각 미설정 시 타이머 중지
    // Stop timer if not authenticated or no expiry set
    if (!isAuthenticated || !sessionExpiresAt) {
      setRemainingSeconds(null);
      setShowModal(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((sessionExpiresAt - now) / 1000));
      setRemainingSeconds(remaining);

      // 만료 시 자동 로그아웃
      // Auto-logout on expiry
      if (remaining <= 0) {
        handleLogout();
        return;
      }

      // 임계값 도달 시 모달 표시 (각 임계값당 1회)
      // Show modal at threshold (once per threshold)
      for (const threshold of WARN_THRESHOLDS) {
        if (remaining <= threshold && !shownThresholds.current.has(threshold)) {
          shownThresholds.current.add(threshold);
          setShowModal(true);
          break;
        }
      }
    };

    // 초기 실행 + 1초 간격 업데이트
    // Initial run + 1-second interval
    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, sessionExpiresAt, handleLogout]);

  return {
    remainingSeconds,
    sessionDuration,
    showModal,
    setShowModal,
    extendSession,
    handleLogout,
  };
}
