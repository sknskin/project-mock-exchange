/**
 * @file 404 페이지
 * @description 존재하지 않는 경로 접근 시 표시되는 Not Found 페이지
 *
 * @file 404 Page
 * @description Not Found page shown when accessing non-existent routes
 */
'use client';

import { useTranslation } from '@/hooks/useTranslation';
import VirtuExLogo from '@/components/ui/VirtuExLogo';

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
        페이지를 찾을 수 없습니다
      </h1>
      <p className="text-[14px] text-text-secondary max-w-[360px] leading-relaxed mb-8">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>

      <a
        href="/"
        className="h-10 px-6 text-[14px] font-bold text-white bg-accent rounded-xl hover:bg-accent/85 transition-colors flex items-center"
      >
        {t('error.goHome')}
      </a>

      <div className="mt-12 flex items-center gap-2 opacity-30">
        <VirtuExLogo size={16} />
        <span className="text-[11px] font-semibold text-text-quaternary">VirtuEx</span>
      </div>
    </div>
  );
}
