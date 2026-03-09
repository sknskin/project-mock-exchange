/**
 * @file 마켓 티커
 * @description 주요 종목의 실시간 가격을 보여주는 가로 스크롤 티커
 *
 * @file Market Ticker
 * @description Horizontal scrolling ticker showing real-time prices of major assets
 */
'use client';

import { useMemo } from 'react';
import { cn, formatPriceDisplay, formatPercent } from '@/lib/format';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useTranslation } from '@/hooks/useTranslation';
import type { Asset } from '@/types';

// 마켓 티커 Props / Market Ticker Props
interface MarketTickerProps {
  /** 전체 자산 배열 (거래대금 상위 5개 추출)
   * Full asset array (top 5 by turnover extracted) */
  assets: Asset[];
}

/** 마켓 티커 — 거래대금 상위 5개 종목 가로 스크롤 표시
 * Market ticker — horizontal display of top 5 assets by turnover */
export default function MarketTicker({ assets }: MarketTickerProps) {
  const { t } = useTranslation();
  const { display } = useCurrencyDisplay();
  const { query: { data: rateData } } = useExchangeRate();
  const rate = rateData?.rate;

  // 거래대금(price * volume) 기준 상위 5개 추출 / Extract top 5 by turnover (price * volume)
  const topAssets = useMemo(() =>
    [...assets]
      .sort((a, b) => (b.currentPrice * (b.volume ?? 0)) - (a.currentPrice * (a.volume ?? 0)))
      .slice(0, 5),
    [assets],
  );
  if (topAssets.length === 0) return null;

  return (
    <div className="py-4 border-b border-border">
      <div className="flex items-center gap-2 md:gap-2.5 lg:gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1">
        <span className="text-[11px] md:text-[12px] text-text-quaternary font-medium shrink-0 self-center leading-tight text-center min-w-[40px] md:min-w-[44px] whitespace-pre-line">
          {t('market.top5Turnover')}
        </span>
        {topAssets.map((asset) => {
          const isRise = asset.changePercent > 0;
          const isFall = asset.changePercent < 0;

          return (
            <div
              key={asset.symbol}
              className="flex items-center shrink-0 md:shrink md:flex-1 lg:shrink lg:flex-1 pl-2.5 md:pl-3 pr-2 md:pr-2.5 py-2 md:py-2.5 rounded-xl bg-bg-secondary/40 min-w-0"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[10px] md:text-[11px] text-text-quaternary font-medium mb-0.5 truncate">
                  {asset.name ?? asset.symbol}
                </div>
                <div className="flex items-baseline gap-1.5 md:gap-2">
                  <span className="text-[13px] md:text-[14px] font-bold text-text-primary tabular-nums truncate">
                    {formatPriceDisplay(asset.currentPrice, asset.symbol, display, rate)}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] md:text-[11px] font-semibold tabular-nums shrink-0',
                      isRise && 'text-rise',
                      isFall && 'text-fall',
                      !isRise && !isFall && 'text-text-quaternary',
                    )}
                  >
                    {formatPercent(asset.changePercent)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
