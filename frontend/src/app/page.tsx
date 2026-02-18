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
  { key: 'popular', label: '인기 종목' },
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
      for (const info of assetInfos as AssetInfo[]) {
        map[info.symbol] = info;
      }
    }
    return map;
  }, [assetInfos]);

  const assets = useMemo(() => {
    if (!rawPrices) return [];
    return (rawPrices as any[]).map((p): Asset => {
      const info = assetMap[p.symbol];
      return {
        ...p,
        name: info?.name ?? p.symbol,
        type: info?.assetType ?? 'CRYPTO',
        currentPrice: p.price,
        changePercent: p.changePercent24h ?? 0,
        changeAmount: p.change24h ?? 0,
      };
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
      if (live) {
        return {
          ...asset,
          currentPrice: live.price,
          price: live.price,
          changePercent: live.changePercent ?? asset.changePercent,
          changeAmount: live.changeAmount ?? asset.changeAmount,
        };
      }
      return asset;
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.symbol.toLowerCase().includes(q) ||
          (a.name ?? '').toLowerCase().includes(q),
      );
    }

    return result;
  }, [assets, livePrices, search]);

  return (
    <div>
      {/* Market Ticker */}
      {!pricesLoading && displayAssets.length > 0 && (
        <MarketTicker assets={displayAssets} />
      )}

      {/* Main section tabs */}
      <div className="px-4 sm:px-6 pt-4 overflow-x-auto scrollbar-hide">
        <div className="flex items-center bg-bg-secondary rounded-xl p-1 w-fit">
          {mainTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveMainTab(tab.key)}
              className={cn(
                'h-9 px-5 text-[14px] font-bold transition-all duration-200 rounded-lg shrink-0',
                activeMainTab === tab.key
                  ? 'bg-bg-tertiary text-text-primary shadow-sm'
                  : 'text-text-quaternary hover:text-text-tertiary',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Asset List */}
      {pricesLoading ? (
        <AssetListSkeleton />
      ) : (
        <AssetList assets={displayAssets} />
      )}
    </div>
  );
}
