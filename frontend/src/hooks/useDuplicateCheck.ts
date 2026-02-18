'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

type DuplicateStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

export function useDuplicateCheck(field: string, value: string, minLength = 1) {
  const [status, setStatus] = useState<DuplicateStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!value || value.length < minLength) {
      setStatus('idle');
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

  return status;
}
