'use client';

import { cn, formatPrice, formatAmount, formatPercent } from '@/lib/format';
import type { Asset } from '@/types';

interface MarketTickerProps {
  assets: Asset[];
}

export default function MarketTicker({ assets }: MarketTickerProps) {
  const topAssets = assets.slice(0, 5);

  if (topAssets.length === 0) return null;

  return (
    <div className="bg-bg-secondary/30 border-b border-border/40">
      <div className="px-4 sm:px-6 py-4 flex gap-4 sm:gap-6 lg:gap-10 overflow-x-auto scrollbar-hide">
        {topAssets.map((asset) => {
          const isRise = asset.changePercent > 0;
          const isFall = asset.changePercent < 0;

          return (
            <div key={asset.symbol} className="shrink-0 min-w-[140px]">
              <div className="text-[12px] text-text-tertiary font-medium mb-1.5">
                {asset.name ?? asset.symbol}
              </div>
              <div className="text-[17px] font-bold text-text-primary tabular-nums">
                {formatPrice(asset.currentPrice)}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={cn(
                    'text-[12px] font-semibold tabular-nums',
                    isRise && 'text-rise',
                    isFall && 'text-fall',
                    !isRise && !isFall && 'text-text-quaternary',
                  )}
                >
                  {formatAmount(asset.changeAmount)}
                </span>
                <span
                  className={cn(
                    'text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded',
                    isRise && 'bg-rise/10 text-rise',
                    isFall && 'bg-fall/10 text-fall',
                    !isRise && !isFall && 'bg-bg-tertiary text-text-quaternary',
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
