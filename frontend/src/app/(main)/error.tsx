/**
 * @file 메인 라우트 에러 바운더리
 * @description 인증된 메인 페이지에서 에러 발생 시 대시보드 이동 안내
 *
 * @file Main Route Error Boundary
 * @description Error UI for authenticated pages with dashboard navigation
 */
'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error('[MainErrorBoundary]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-danger" />
      </div>

      <h1 className="text-[22px] font-extrabold text-text-primary mb-2">
        {t('error.pageLoadFailed')}
      </h1>
      <p className="text-[14px] text-text-secondary max-w-[380px] leading-relaxed mb-2 whitespace-pre-line">
        {t('error.pageLoadDesc')}
      </p>
      <p className="text-[13px] text-text-tertiary max-w-[380px] leading-relaxed mb-8">
        {t('error.persistent')}
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="h-10 px-6 text-[14px] font-bold text-white bg-accent rounded-xl hover:bg-accent/85 transition-colors"
        >
          {t('error.retry')}
        </button>
        <a
          href="/dashboard"
          className="h-10 px-6 text-[14px] font-semibold text-text-secondary bg-bg-secondary rounded-xl hover:bg-bg-tertiary transition-colors flex items-center"
        >
          {t('error.goDashboard')}
        </a>
      </div>
    </div>
  );
}
