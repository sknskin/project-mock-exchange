/**
 * @file 중복 확인 훅
 * @description 이메일, 아이디 등의 중복 여부를 디바운스로 확인합니다
 *
 * @file Duplicate Check Hook
 * @description Checks duplication of email/username with debounce
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';

/**
 * 중복 확인 상태 타입
 * Duplicate check status type
 *
 * - 'idle': 초기 상태 또는 입력 미달 / Initial state or below minimum length
 * - 'checking': 확인 중 / Checking in progress
 * - 'available': 사용 가능 / Available
 * - 'taken': 이미 사용 중 / Already taken
 * - 'error': API 오류 / API error
 */
type DuplicateStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

/** 디바운스 대기 시간 (ms) — 타이핑 중 불필요한 API 호출 방지
 * Debounce delay (ms) — prevents unnecessary API calls during typing */
const DEBOUNCE_MS = 500;

/**
 * 이메일, 아이디 등의 중복 여부를 디바운스 방식으로 확인하는 훅
 * value가 변경될 때마다 500ms 디바운스 후 API를 호출합니다.
 * checkNow()를 직접 호출하면 디바운스 없이 즉시 확인합니다.
 *
 * Hook that checks field duplication (email, username, etc.) with debounce.
 * Calls the API after a 500ms debounce whenever value changes.
 * Call checkNow() for immediate check without debounce.
 *
 * @param field - 확인할 필드명 ('email', 'username' 등) / Field name to check ('email', 'username', etc.)
 * @param value - 확인할 값 / Value to check
 * @param minLength - 최소 입력 길이 (기본: 1) — 이하일 때는 idle 상태 유지 / Minimum input length (default: 1) — stays idle below this
 * @returns {{ status: DuplicateStatus, checkNow: () => Promise<void> }}
 */
export function useDuplicateCheck(field: string, value: string, minLength = 1) {
  const [status, setStatus] = useState<DuplicateStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 마지막으로 확인된 값을 추적하여 동일 값 중복 요청 방지
  // Track last checked value to prevent duplicate requests for the same value
  const lastCheckedRef = useRef<string>('');

  // 중복 확인 API 호출 공통 로직 / Shared duplicate check API call logic
  const performCheck = useCallback(async (checkValue: string) => {
    setStatus('checking');
    try {
      const { data } = await api.get('/api/auth/check-duplicate', {
        params: { field, value: checkValue },
      });
      const exists = data.data?.exists ?? data.exists;
      lastCheckedRef.current = checkValue;
      // exists=true → 이미 사용 중(taken), false → 사용 가능(available)
      // exists=true → already taken, false → available
      setStatus(exists ? 'taken' : 'available');
    } catch {
      setStatus('error');
    }
  }, [field]);

  /**
   * 디바운스 없이 즉시 중복 확인 (폼 제출 전 최종 확인 시 사용)
   * Immediately check without debounce (used for final check before form submission)
   */
  const checkNow = useCallback(async () => {
    if (!value || value.length < minLength) return;
    // 이미 확인된 값이면 스킵 / Skip if already checked
    if (lastCheckedRef.current === value) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    await performCheck(value);
  }, [value, minLength, performCheck]);

  // value 변경 시 디바운스 타이머 설정 / Set debounce timer on value change
  useEffect(() => {
    // 최소 길이 미달 시 idle로 초기화 / Reset to idle when below minimum length
    if (!value || value.length < minLength) {
      setStatus('idle');
      lastCheckedRef.current = '';
      return;
    }

    // 즉시 'checking' 상태로 전환하여 UI에 로딩 표시
    // Immediately set to 'checking' to show loading indicator in UI
    setStatus('checking');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 500ms 디바운스 후 실제 API 호출
    // Actual API call after 500ms debounce
    timerRef.current = setTimeout(() => {
      performCheck(value);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [field, value, minLength, performCheck]);

  return { status, checkNow };
}
