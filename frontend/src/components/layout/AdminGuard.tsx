'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { t } = useTranslation();

  const [mounted, setMounted] = useState(false);
  useIsomorphicLayoutEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  // Pre-hydrate 스크립트에서 role을 확인하여 깜빡임 방지
  if (!isAuthenticated) {
    const browserHasAuth = typeof document !== 'undefined'
      && document.documentElement.dataset.authed === '1';
    if (browserHasAuth) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      );
    }
    router.replace('/dashboard');
    return null;
  }

  if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  return <>{children}</>;
}
