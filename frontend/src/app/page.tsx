'use client';

import { useState, useMemo, useCallback } from 'react';
import { useMarketPrices, useAssets } from '@/hooks/useMarket';
import { useWebSocket } from '@/hooks/useWebSocket';
import AssetList from '@/components/market/AssetList';
import SearchBar from '@/components/market/SearchBar';
import { AssetListSkeleton } from '@/components/ui/Skeleton';
import type { Asset, AssetInfo, PriceUpdate } from '@/types';

export default function HomePage() {
  const { data: rawPrices, isLoading: pricesLoading } = useMarketPrices();
  const { data: assetInfos } = useAssets();
  const [search, setSearch] = useState('');
  const [livePrices, setLivePrices] = useState<Record<string, PriceUpdate>>({});

  // Build asset info lookup
  const assetMap = useMemo(() => {
    const map: Record<string, AssetInfo> = {};
    if (assetInfos) {
      for (const info of assetInfos as AssetInfo[]) {
        map[info.symbol] = info;
      }
    }
    return map;
  }, [assetInfos]);

  // Normalize prices into Asset format
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
      <SearchBar value={search} onChange={setSearch} />
      {pricesLoading ? (
        <AssetListSkeleton />
      ) : (
        <AssetList assets={displayAssets} />
      )}
    </div>
  );
}
