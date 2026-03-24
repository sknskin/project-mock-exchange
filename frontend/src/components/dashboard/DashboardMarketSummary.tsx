/**
 * @file 대시보드 시장 요약 영역
 * @description 시장 지수 마키, 티커, 환율 바를 묶은 요약 섹션
 *
 * @file Dashboard Market Summary Section
 * @description Combines market index marquee, ticker, and exchange rate bar
 */
'use client';

import MarketIndexSummary from '@/components/market/MarketIndexSummary';
import MarketTicker from '@/components/market/MarketTicker';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import type { Asset } from '@/types';

interface DashboardMarketSummaryProps {
  /** 가격 로딩 중 여부
   * Whether prices are still loading */
  pricesLoading: boolean;
  /** 화면에 표시할 자산 배열
   * Asset array to display */
  displayAssets: Asset[];
}

export default function DashboardMarketSummary({ pricesLoading, displayAssets }: DashboardMarketSummaryProps) {
  return (
    <>
      {/* 시장 지수 마키 — Yahoo Finance 실제 데이터 / Market index marquee — real Yahoo Finance data */}
      <MarketIndexSummary />

      {/* 시장 요약 영역 — 티커, 환율 바 / Market summary — ticker, exchange rate bar */}
      {!pricesLoading && displayAssets.length > 0 && (
        <>
          <MarketTicker assets={displayAssets} />
          <ExchangeRateBar />
        </>
      )}
    </>
  );
}
