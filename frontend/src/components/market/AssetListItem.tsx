'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { cn, formatPrice, formatPercent, formatVolume } from '@/lib/format';
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
      className="flex items-center px-5 sm:px-6 h-[52px] hover:bg-white/[0.02] transition-colors"
    >
      {/* Heart */}
      <button
        className="text-text-quaternary/40 hover:text-text-tertiary transition-colors"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <Heart className="w-[18px] h-[18px]" strokeWidth={1.5} />
      </button>

      {/* Rank */}
      <span className="w-7 text-center text-[14px] text-text-quaternary tabular-nums ml-1 shrink-0">
        {rank}
      </span>

      {/* Icon + Name */}
      <div className="flex items-center gap-3 flex-1 pl-3 min-w-0">
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0',
          getSymbolColor(asset.symbol),
        )}>
          {asset.symbol.slice(0, 2)}
        </div>
        <span className="font-medium text-text-primary text-[15px] truncate">
          {asset.name}
        </span>
      </div>

      {/* Price */}
      <span className="w-[130px] text-right text-[15px] font-medium text-text-primary tabular-nums shrink-0">
        {formatPrice(asset.currentPrice)}원
      </span>

      {/* Change percent */}
      <div className="w-[90px] flex justify-end shrink-0">
        {isExtreme ? (
          <span
            className={cn(
              'text-[14px] font-medium tabular-nums px-2 py-0.5 rounded',
              isRise ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall',
            )}
          >
            {formatPercent(asset.changePercent)}
          </span>
        ) : (
          <span
            className={cn(
              'text-[14px] font-medium tabular-nums',
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
      <span className="w-[100px] text-right text-[14px] text-text-tertiary tabular-nums hidden md:block shrink-0">
        {formatVolume(asset.volume ?? 0)}
      </span>
    </Link>
  );
}
