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
      className="flex items-center px-5 sm:px-6 h-[58px] hover:bg-white/[0.02] transition-colors"
    >
      {/* Heart */}
      <button
        className="text-text-quaternary/40 hover:text-rise/60 transition-colors mr-1.5 sm:mr-2 shrink-0"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <Heart className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px]" strokeWidth={1.5} />
      </button>

      {/* Rank */}
      <span className="w-6 sm:w-8 text-center text-[13px] sm:text-[14px] text-text-quaternary tabular-nums shrink-0">
        {rank}
      </span>

      {/* Icon + Name + Symbol */}
      <div className="flex items-center gap-2.5 sm:gap-3 w-[110px] sm:w-[170px] lg:w-[220px] pl-1.5 sm:pl-2 min-w-0 shrink-0">
        <div className={cn(
          'w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-white shrink-0',
          getSymbolColor(asset.symbol),
        )}>
          {asset.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-text-primary text-[13px] sm:text-[14px] truncate leading-tight">
            {asset.name}
          </div>
          <div className="text-[10px] sm:text-[11px] text-text-quaternary mt-0.5">
            {asset.symbol}
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Price */}
      <span className="w-[90px] sm:w-[110px] text-right text-[13px] sm:text-[14px] font-medium text-text-primary tabular-nums shrink-0">
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
      <div className="w-[68px] sm:w-[80px] flex justify-end shrink-0">
        {isExtreme ? (
          <span
            className={cn(
              'text-[12px] sm:text-[13px] font-semibold tabular-nums px-1.5 sm:px-2 py-0.5 rounded',
              isRise ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall',
            )}
          >
            {formatPercent(asset.changePercent)}
          </span>
        ) : (
          <span
            className={cn(
              'text-[12px] sm:text-[13px] font-medium tabular-nums',
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
