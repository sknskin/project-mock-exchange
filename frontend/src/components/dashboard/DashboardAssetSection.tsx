/**
 * @file 대시보드 종목 목록 섹션
 * @description 로딩 중 스켈레톤, 완료 후 AssetList + AI 분석 버튼 표시
 *
 * @file Dashboard Asset Section
 * @description Shows skeleton while loading, then AssetList with AI analysis button
 */
'use client';

import { type ReactNode } from 'react';
import AssetList from '@/components/market/AssetList';
import { AssetListSkeleton } from '@/components/ui/Skeleton';
import type { Asset } from '@/types';

interface DashboardAssetSectionProps {
  /** 가격 로딩 중 여부
   * Whether prices are still loading */
  pricesLoading: boolean;
  /** 필터링된 자산 배열
   * Filtered asset array */
  assets: Asset[];
  /** 현재 기간 필터
   * Current period filter */
  period: string;
  /** 기간 변경 콜백
   * Period change callback */
  onPeriodChange: (period: string) => void;
  /** 현재 메인 탭
   * Current main tab */
  mainTab: string;
  /** 로그인 필요 콜백
   * Login required callback */
  onLoginRequired: () => void;
  /** 관심종목 심볼 목록
   * Watchlist symbol list */
  watchlistSymbols: string[] | undefined;
  /** 관심종목 토글 콜백
   * Watchlist toggle callback */
  onToggleWatchlist: (symbol: string) => void;
  /** AI 분석 버튼 ReactNode
   * AI analysis button ReactNode */
  aiButton: ReactNode;
}

export default function DashboardAssetSection({
  pricesLoading,
  assets,
  period,
  onPeriodChange,
  mainTab,
  onLoginRequired,
  watchlistSymbols,
  onToggleWatchlist,
  aiButton,
}: DashboardAssetSectionProps) {
  // ANI-M-03: 스켈레톤→콘텐츠 크로스페이드 — 로딩 완료 시 부드럽게 전환
  // ANI-M-03: Skeleton-to-content crossfade — smooth transition when loading completes
  if (pricesLoading) {
    return <AssetListSkeleton />;
  }

  return (
    <div className="animate-content-fade">
      <AssetList
        assets={assets}
        period={period}
        onPeriodChange={onPeriodChange}
        mainTab={mainTab}
        onLoginRequired={onLoginRequired}
        watchlistSymbols={watchlistSymbols}
        onToggleWatchlist={onToggleWatchlist}
        aiButton={aiButton}
      />
    </div>
  );
}
