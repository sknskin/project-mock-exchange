'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { cn, formatCompactPrice, formatPercent, formatAmount, formatVolume } from '@/lib/format';
import type { Asset } from '@/types';

interface AssetListItemProps {
  asset: Asset;
  rank: number;
}

function getSymbolColor(symbol: string): string {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500',
    'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
    'bg-rose-500', 'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function AssetListItem({ asset, rank }: AssetListItemProps) {
  const isRise = asset.changePercent > 0;
  const isFall = asset.changePercent < 0;
  const isExtreme = Math.abs(asset.changePercent) >= 5;

  return (
    <Link
      href={`/asset/${asset.symbol}`}
      className="flex items-center h-[60px] hover:bg-white/[0.02] transition-colors rounded-lg -mx-2 px-2"
    >
      {/* Rank */}
      <span className="w-[52px] text-center text-[14px] text-text-quaternary tabular-nums shrink-0">
        {rank}
      </span>

      {/* Icon + Name + Symbol */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0',
          getSymbolColor(asset.symbol),
        )}>
          {asset.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-text-primary text-[14px] truncate leading-tight">
            {asset.name}
          </div>
          <div className="text-[11px] text-text-quaternary mt-0.5">
            {asset.symbol}
          </div>
        </div>
      </div>

      {/* Price */}
      <span className="w-[100px] text-right text-[14px] font-medium text-text-primary tabular-nums shrink-0">
        {formatCompactPrice(asset.currentPrice)}원
      </span>

      {/* Change amount */}
      <span
        className={cn(
          'w-[90px] text-right text-[13px] font-medium tabular-nums hidden sm:block shrink-0',
          isRise && 'text-rise',
          isFall && 'text-fall',
          !isRise && !isFall && 'text-text-quaternary',
        )}
      >
        {formatAmount(asset.changeAmount ?? 0)}
      </span>

      {/* Change percent */}
      <div className="w-[72px] flex justify-end shrink-0">
        {isExtreme ? (
          <span
            className={cn(
              'text-[13px] font-semibold tabular-nums px-2 py-0.5 rounded',
              isRise ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall',
            )}
          >
            {formatPercent(asset.changePercent)}
          </span>
        ) : (
          <span
            className={cn(
              'text-[13px] font-medium tabular-nums',
              isRise && 'text-rise',
              isFall && 'text-fall',
              !isRise && !isFall && 'text-text-quaternary',
            )}
          >
            {formatPercent(asset.changePercent)}
          </span>
        )}
      </div>

      {/* Volume */}
      <span className="w-[80px] text-right text-[13px] text-text-tertiary tabular-nums hidden md:block shrink-0">
        {formatVolume(asset.volume ?? 0)}
      </span>
    </Link>
  );
}
