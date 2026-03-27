/**
 * @file 404 페이지
 * @description 존재하지 않는 경로 접근 시 표시되는 Not Found 페이지
 *
 * @file 404 Page
 * @description Not Found page shown when accessing non-existent routes
 */
'use client';

import Link from 'next/link';
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

      {/* 404-L-01: 대시보드 및 도움말 링크 추가 — 사용자가 쉽게 복귀할 수 있도록 */}
      {/* 404-L-01: Add dashboard and help links — help users navigate back easily */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/dashboard"
          className="h-10 px-6 text-[14px] font-bold text-white bg-accent rounded-xl hover:bg-accent/85 transition-colors flex items-center"
        >
          {t('error.goHome')}
        </Link>
        <Link
          href="/help"
          className="h-10 px-6 text-[14px] font-bold text-text-secondary border border-border rounded-xl hover:bg-bg-secondary transition-colors flex items-center"
        >
          {t('nav.help')}
        </Link>
      </div>
    </div>
  );
}
