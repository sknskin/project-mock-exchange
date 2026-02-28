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

type DuplicateStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

/** 디바운스 대기 시간 (ms) / Debounce delay (ms) */
const DEBOUNCE_MS = 500;

export function useDuplicateCheck(field: string, value: string, minLength = 1) {
  const [status, setStatus] = useState<DuplicateStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedRef = useRef<string>('');

  // 중복 확인 API 호출 (Shared duplicate check API call)
  const performCheck = useCallback(async (checkValue: string) => {
    setStatus('checking');
    try {
      const { data } = await api.get('/api/auth/check-duplicate', {
        params: { field, value: checkValue },
      });
      const exists = data.data?.exists ?? data.exists;
      lastCheckedRef.current = checkValue;
      setStatus(exists ? 'taken' : 'available');
    } catch {
      setStatus('error');
    }
  }, [field]);

  const checkNow = useCallback(async () => {
    if (!value || value.length < minLength) return;
    if (lastCheckedRef.current === value) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    await performCheck(value);
  }, [value, minLength, performCheck]);

  useEffect(() => {
    if (!value || value.length < minLength) {
      setStatus('idle');
      lastCheckedRef.current = '';
      return;
    }

    setStatus('checking');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

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
