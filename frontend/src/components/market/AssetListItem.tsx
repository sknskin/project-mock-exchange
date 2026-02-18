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
    'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-orange-600',
    'bg-pink-600', 'bg-cyan-600', 'bg-yellow-600', 'bg-indigo-600',
    'bg-red-600', 'bg-teal-600',
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
      className="flex items-center px-6 py-3 hover:bg-bg-secondary/50 transition-colors"
    >
      {/* Heart icon */}
      <button
        className="mr-2.5 text-text-quaternary hover:text-text-tertiary transition-colors"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <Heart className="w-[18px] h-[18px]" strokeWidth={1.5} />
      </button>

      {/* Rank */}
      <span className="w-7 text-center text-[14px] text-text-secondary tabular-nums font-medium">
        {rank}
      </span>

      {/* Symbol icon + name */}
      <div className="flex items-center gap-2.5 flex-1 pl-3 min-w-0">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0',
          bgColor,
        )}>
          {asset.symbol.slice(0, 2)}
        </div>
        <span className="font-semibold text-text-primary text-[14px] truncate">
          {asset.name}
        </span>
      </div>

      {/* Price */}
      <span className="w-[120px] text-right text-[14px] font-medium text-text-primary tabular-nums">
        {formatPrice(asset.currentPrice)}원
      </span>

      {/* Change percent - with badge for extreme values */}
      <div className="w-[100px] flex justify-end">
        {isExtreme ? (
          <span
            className={cn(
              'text-[13px] font-bold tabular-nums px-2 py-0.5 rounded-md',
              isRise ? 'bg-rise/15 text-rise' : 'bg-fall/15 text-fall',
            )}
          >
            {formatPercent(asset.changePercent)}
          </span>
        ) : (
          <span
            className={cn(
              'text-[14px] font-semibold tabular-nums',
              isRise && 'text-rise',
              isFall && 'text-fall',
              !isRise && !isFall && 'text-text-quaternary',
            )}
          >
            {formatPercent(asset.changePercent)}
          </span>
        )}
      </div>

      {/* Volume in 억원 format */}
      <span className="w-[100px] text-right text-[13px] text-text-tertiary tabular-nums hidden md:block">
        {formatVolume(asset.volume ?? 0)}
      </span>
    </Link>
  );
}
