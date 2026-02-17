'use client';

import Link from 'next/link';
import PriceDisplay from './PriceDisplay';
import type { Asset } from '@/types';

interface AssetListItemProps {
  asset: Asset;
}

export default function AssetListItem({ asset }: AssetListItemProps) {
  return (
    <Link
      href={`/asset/${asset.symbol}`}
      className="flex items-center justify-between px-5 py-3.5 hover:bg-bg-secondary transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-sm font-bold text-accent">
          {asset.symbol.slice(0, 2)}
        </div>
        <div>
          <div className="font-medium text-text-primary text-sm">
            {asset.name}
          </div>
          <div className="text-xs text-text-secondary">{asset.symbol}</div>
        </div>
      </div>
      <PriceDisplay
        price={asset.currentPrice}
        changePercent={asset.changePercent}
        size="sm"
      />
    </Link>
  );
}
