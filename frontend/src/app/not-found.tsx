/**
 * @file 404 페이지
 * @description 존재하지 않는 경로 접근 시 표시되는 Not Found 페이지
 *
 * @file 404 Page
 * @description Not Found page shown when accessing non-existent routes
 */
'use client';

import { useTranslation } from '@/hooks/useTranslation';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-5 text-center">
      <div className="mb-8">
        <span className="text-[72px] font-extrabold text-text-quaternary/30 leading-none">
          404
        </span>
      </div>

      <h1 className="text-[22px] font-extrabold text-text-primary mb-3">
        {t('error.notFound')}
      </h1>
      <p className="text-[14px] text-text-secondary max-w-[360px] leading-relaxed mb-8">
        {t('error.notFoundDesc')}
      </p>

      <a
        href="/"
        className="h-10 px-6 text-[14px] font-bold text-white bg-accent rounded-xl hover:bg-accent/85 transition-colors flex items-center"
      >
        {t('error.goHome')}
      </a>
    </div>
  );
}
