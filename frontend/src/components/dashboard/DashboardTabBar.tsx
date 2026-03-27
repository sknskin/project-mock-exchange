/**
 * @file 대시보드 메인 탭 바
 * @description 실시간, 인기, 급상승, 관심종목 탭 + 데이터 출처 배지
 *
 * @file Dashboard Main Tab Bar
 * @description Realtime, popular, trending, watchlist tabs + data source badges
 */
'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';

interface DashboardTabBarProps {
  /** 현재 활성 탭 키
   * Currently active tab key */
  activeMainTab: string;
  /** 탭 변경 콜백
   * Tab change callback */
  onTabChange: (key: string) => void;
}

function DashboardTabBarInner({ activeMainTab, onTabChange }: DashboardTabBarProps) {
  const { t } = useTranslation();

  const mainTabs = [
    { key: 'realtime', label: t('market.realtimeChart') },
    { key: 'popular', label: t('market.popular') },
    { key: 'trending', label: t('market.trending') },
    { key: 'watchlist', label: t('market.watchlist') },
  ];

  return (
    // 메인 탭 바 — 접근성: role="tablist", aria-selected / Main tab bar — a11y: tablist + aria-selected
    <div className="flex items-end gap-3 sm:gap-5 md:gap-7 pt-7 pb-0 border-b border-border overflow-x-auto scrollbar-hide" role="tablist">
      {mainTabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={activeMainTab === tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            'pb-3.5 text-[13px] sm:text-[14px] md:text-[15px] font-bold transition-colors relative whitespace-nowrap shrink-0',
            activeMainTab === tab.key
              ? 'text-text-primary'
              : 'text-text-tertiary hover:text-text-secondary',
          )}
        >
          {tab.label}
          {activeMainTab === tab.key && (
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-accent rounded-full" />
          )}
        </button>
      ))}
      {/* 데이터 출처 배지 — 데스크탑에서만 표시 / Data source badges — desktop only */}
      <span className="ml-auto mb-2.5 hidden md:inline-flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-emerald-400">{t('filter.crypto')}: Binance</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rise/10 border border-rise/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rise animate-pulse" />
          <span className="text-[10px] font-semibold text-rise/80">{t('filter.stock')}: {t('market.simulatedData')}</span>
        </span>
      </span>
    </div>
  );
}

import React from 'react';
export default React.memo(DashboardTabBarInner);
