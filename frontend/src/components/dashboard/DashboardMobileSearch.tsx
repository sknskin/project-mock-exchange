/**
 * @file 대시보드 모바일 검색 바
 * @description lg 미만 화면에서 표시되는 스포트라이트 검색 버튼
 *
 * @file Dashboard Mobile Search Bar
 * @description Spotlight search button shown on screens below lg breakpoint
 */
'use client';

import { Search } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface DashboardMobileSearchProps {
  /** 스포트라이트 검색 모달 열기 콜백
   * Callback to open the spotlight search modal */
  onOpen: () => void;
}

export default function DashboardMobileSearch({ onOpen }: DashboardMobileSearchProps) {
  const { t } = useTranslation();

  return (
    <div className="lg:hidden pt-2 pb-1">
      <button
        onClick={onOpen}
        className="w-full flex items-center gap-2.5 bg-bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-[13px] text-text-quaternary transition-colors hover:border-border/80"
      >
        <Search className="w-4 h-4" />
        <span>{t('nav.searchPlaceholder')}</span>
      </button>
    </div>
  );
}
