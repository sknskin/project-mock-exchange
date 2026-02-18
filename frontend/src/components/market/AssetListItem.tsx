'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { cn, formatPrice, formatPercent, formatAmount, formatVolume } from '@/lib/format';
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
  const bgColor = getSymbolColor(asset.symbol);

  return (
    <Link
      href={`/asset/${asset.symbol}`}
      className="flex items-center px-4 sm:px-6 py-3.5 hover:bg-bg-secondary/40 active:bg-bg-secondary/60 transition-colors group"
    >
      {/* Favorite */}
      <button
        className="mr-2 text-text-quaternary/60 hover:text-text-tertiary group-hover:text-text-quaternary transition-colors"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <Heart className="w-4 h-4" strokeWidth={1.5} />
      </button>

      {/* Rank */}
      <span className="w-7 text-center text-[13px] text-text-quaternary tabular-nums font-semibold shrink-0">
        {rank}
      </span>

      {/* Symbol icon + Name + Symbol */}
      <div className="flex items-center gap-3 flex-1 pl-2.5 min-w-0">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ring-1 ring-white/10',
          bgColor,
        )}>
          {asset.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-text-primary text-[14px] leading-tight truncate">
            {asset.name}
          </div>
          <div className="text-[11px] text-text-quaternary mt-0.5 leading-none">
            {asset.symbol}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="text-right shrink-0 pl-3 min-w-[100px] sm:min-w-[130px]">
        <div className="text-[14px] font-semibold text-text-primary tabular-nums leading-tight">
          {formatPrice(asset.currentPrice)}
          <span className="text-[11px] text-text-quaternary ml-0.5">원</span>
        </div>
        {/* Change amount - below price */}
        <div
          className={cn(
            'text-[11px] tabular-nums mt-0.5 leading-none font-medium',
            isRise && 'text-rise',
            isFall && 'text-fall',
            !isRise && !isFall && 'text-text-quaternary',
          )}
        >
          {formatAmount(asset.changeAmount)}
        </div>
      </div>

      {/* Change percent */}
      <div className="w-[76px] sm:w-[88px] flex justify-end shrink-0 pl-2">
        {isExtreme ? (
          <span
            className={cn(
              'text-[13px] font-bold tabular-nums px-2.5 py-1 rounded-lg',
              isRise ? 'bg-rise/12 text-rise' : 'bg-fall/12 text-fall',
            )}
          >
            {formatPercent(asset.changePercent)}
          </span>
        ) : (
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
        )}
      </div>

      {/* Volume */}
      <span className="w-[88px] text-right text-[13px] text-text-quaternary tabular-nums hidden md:block shrink-0 pl-2">
        {formatVolume(asset.volume ?? 0)}
      </span>
    </Link>
  );
}
