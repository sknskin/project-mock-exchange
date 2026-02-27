/**
 * @file 인증 라우트 에러 바운더리
 * @description 로그인/회원가입 페이지에서 에러 발생 시 로그인 이동 안내
 *
 * @file Auth Route Error Boundary
 * @description Error UI for login/register pages with login navigation
 */
'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error('[AuthErrorBoundary]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-danger" />
      </div>

      <h1 className="text-[22px] font-extrabold text-text-primary mb-2">
        {t('error.authFailed')}
      </h1>
      <p className="text-[14px] text-text-secondary max-w-[380px] leading-relaxed mb-8 whitespace-pre-line">
        {t('error.authDesc')}
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="h-10 px-6 text-[14px] font-bold text-white bg-accent rounded-xl hover:bg-accent/85 transition-colors"
        >
          {t('error.retry')}
        </button>
        <a
          href="/login"
          className="h-10 px-6 text-[14px] font-semibold text-text-secondary bg-bg-secondary rounded-xl hover:bg-bg-tertiary transition-colors flex items-center"
        >
          {t('error.goLogin')}
        </a>
      </div>
    </div>
  );
}
