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

export function useDuplicateCheck(field: string, value: string, minLength = 1) {
  const [status, setStatus] = useState<DuplicateStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedRef = useRef<string>('');

  const checkNow = useCallback(async () => {
    if (!value || value.length < minLength) return;
    if (lastCheckedRef.current === value) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('checking');
    try {
      const { data } = await api.get('/api/auth/check-duplicate', {
        params: { field, value },
      });
      const exists = data.data?.exists ?? data.exists;
      lastCheckedRef.current = value;
      setStatus(exists ? 'taken' : 'available');
    } catch {
      setStatus('error');
    }
  }, [field, value, minLength]);

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

    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/api/auth/check-duplicate', {
          params: { field, value },
        });
        const exists = data.data?.exists ?? data.exists;
        lastCheckedRef.current = value;
        setStatus(exists ? 'taken' : 'available');
      } catch {
        setStatus('error');
      }
    }, 500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [field, value, minLength]);

  return { status, checkNow };
}
