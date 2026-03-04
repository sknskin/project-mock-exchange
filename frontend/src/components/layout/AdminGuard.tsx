/**
 * @file 관리자 접근 제어 가드 컴포넌트
 * @description SYSTEM/ADMIN 역할만 접근 허용 — SSR 하이드레이션 깜빡임 방지를 위해 useIsomorphicLayoutEffect 사용
 *
 * @file Admin Access Guard Component
 * @description Only allows SYSTEM/ADMIN roles — uses useIsomorphicLayoutEffect to prevent SSR hydration flicker
 */
'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';

// SSR/CSR 양쪽에서 안전한 레이아웃 이펙트 / Isomorphic layout effect safe for both SSR and CSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { t } = useTranslation();

  // 클라이언트 마운트 상태 추적 / Track client mount state
  const [mounted, setMounted] = useState(false);
  useIsomorphicLayoutEffect(() => { setMounted(true); }, []);

  // 마운트 전 로딩 스피너 표시 (하이드레이션 깜빡임 방지) / Show spinner before mount (prevents hydration flicker)
  if (!mounted) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  // Pre-hydrate 스크립트에서 role을 확인하여 깜빡임 방지 / Check role from pre-hydrate script to prevent flicker
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
    // 미인증 시 대시보드로 리디렉트 / Redirect to dashboard if not authenticated
    router.replace('/dashboard');
    return null;
  }

  // SYSTEM/ADMIN 외 역할은 접근 차단 / Block access for roles other than SYSTEM/ADMIN
  if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  return <>{children}</>;
}
