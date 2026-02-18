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
    <div className="border-b border-border">
      <div className="px-6 py-4 flex gap-10 overflow-x-auto scrollbar-hide">
        {topAssets.map((asset) => {
          const isRise = asset.changePercent > 0;
          const isFall = asset.changePercent < 0;

          return (
            <div key={asset.symbol} className="shrink-0">
              <div className="text-[12px] text-text-tertiary font-medium mb-1">
                {asset.name ?? asset.symbol}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[16px] font-bold text-text-primary tabular-nums">
                  {formatPrice(asset.currentPrice)}
                </span>
                <span
                  className={cn(
                    'text-[13px] font-semibold tabular-nums',
                    isRise && 'text-rise',
                    isFall && 'text-fall',
                    !isRise && !isFall && 'text-text-quaternary',
                  )}
                >
                  {formatAmount(asset.changeAmount)} ({formatPercent(asset.changePercent)})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
