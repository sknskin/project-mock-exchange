/**
 * @file 마켓 티커
 * @description 주요 종목의 실시간 가격을 보여주는 가로 스크롤 티커
 *
 * @file Market Ticker
 * @description Horizontal scrolling ticker showing real-time prices of major assets
 */
'use client';

import { cn, isKRW, formatPriceDisplay, formatPercent } from '@/lib/format';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import type { Asset } from '@/types';

interface MarketTickerProps {
  assets: Asset[];
}

export default function MarketTicker({ assets }: MarketTickerProps) {
  const topAssets = assets.slice(0, 5);
  const { display } = useCurrencyDisplay();
  const { data: rateData } = useExchangeRate();
  const rate = rateData?.rate;
  if (topAssets.length === 0) return null;

  return (
    <div className="border-b border-border">
      <div className="py-5 flex items-center gap-10 lg:gap-14 overflow-x-auto scrollbar-hide">
        <span className="text-[12px] text-text-quaternary font-medium shrink-0 self-start mt-0.5">
          Top 5
        </span>
        {topAssets.map((asset) => {
          const isRise = asset.changePercent > 0;
          const isFall = asset.changePercent < 0;
          const showKRW = display === 'krw' && !isKRW(asset.symbol);

          return (
            <div key={asset.symbol} className="shrink-0">
              <div className="text-[13px] text-text-tertiary font-medium mb-1.5">
                {asset.name ?? asset.symbol}
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-[16px] font-bold text-text-primary tabular-nums">
                  {formatPriceDisplay(asset.currentPrice, asset.symbol, showKRW, rate)}
                </span>
                <span
                  className={cn(
                    'text-[13px] font-semibold tabular-nums',
                    isRise && 'text-rise',
                    isFall && 'text-fall',
                    !isRise && !isFall && 'text-text-quaternary',
                  )}
                >
                  {formatPercent(asset.changePercent)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
