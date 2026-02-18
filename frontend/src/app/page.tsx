'use client';

import { useState, useMemo, useCallback } from 'react';
import { useMarketPrices, useAssets } from '@/hooks/useMarket';
import { useWebSocket } from '@/hooks/useWebSocket';
import AssetList from '@/components/market/AssetList';
import MarketTicker from '@/components/market/MarketTicker';
import { AssetListSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/format';
import type { Asset, AssetInfo, PriceUpdate } from '@/types';

const mainTabs = [
  { key: 'realtime', label: '실시간 차트' },
  { key: 'popular', label: '지금 뜨는 카테고리' },
  { key: 'trending', label: '투자자 동향' },
];

export default function HomePage() {
  const { data: rawPrices, isLoading: pricesLoading } = useMarketPrices();
  const { data: assetInfos } = useAssets();
  const [search] = useState('');
  const [livePrices, setLivePrices] = useState<Record<string, PriceUpdate>>({});
  const [activeMainTab, setActiveMainTab] = useState('realtime');

  const assetMap = useMemo(() => {
    const map: Record<string, AssetInfo> = {};
    if (assetInfos) {
      for (const info of assetInfos as AssetInfo[]) map[info.symbol] = info;
    }
    return map;
  }, [assetInfos]);

  const assets = useMemo(() => {
    if (!rawPrices) return [];
    return (rawPrices as any[]).map((p): Asset => {
      const info = assetMap[p.symbol];
      return { ...p, name: info?.name ?? p.symbol, type: info?.assetType ?? 'CRYPTO', currentPrice: p.price, changePercent: p.changePercent24h ?? 0, changeAmount: p.change24h ?? 0 };
    });
  }, [rawPrices, assetMap]);

  const symbols = useMemo(() => assets.map((a) => a.symbol), [assets]);
  const handlePriceUpdate = useCallback((update: PriceUpdate) => {
    setLivePrices((prev) => ({ ...prev, [update.symbol]: update }));
  }, []);
  useWebSocket(symbols, handlePriceUpdate);

  const displayAssets = useMemo(() => {
    let result = assets.map((asset) => {
      const live = livePrices[asset.symbol];
      if (live) return { ...asset, currentPrice: live.price, price: live.price, changePercent: live.changePercent ?? asset.changePercent, changeAmount: live.changeAmount ?? asset.changeAmount };
      return asset;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.symbol.toLowerCase().includes(q) || (a.name ?? '').toLowerCase().includes(q));
    }
    return result;
  }, [assets, livePrices, search]);

  return (
    <div>
      {!pricesLoading && displayAssets.length > 0 && (
        <MarketTicker assets={displayAssets} />
      )}

      {/* Section tabs */}
      <div className="flex items-end gap-8 pt-8 pb-0 border-b border-border">
        {mainTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveMainTab(tab.key)}
            className={cn(
              'pb-4 text-[16px] font-bold transition-colors relative',
              activeMainTab === tab.key
                ? 'text-text-primary'
                : 'text-text-quaternary hover:text-text-tertiary',
            )}
          >
            {tab.label}
            {activeMainTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-accent rounded-full" />
            )}
          </button>
        ))}
      </div>

      {pricesLoading ? <AssetListSkeleton /> : <AssetList assets={displayAssets} />}
    </div>
  );
}
