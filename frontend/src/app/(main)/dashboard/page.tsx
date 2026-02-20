/**
 * @file 마켓 대시보드 페이지
 * @description 실시간 시세, 종목 목록, 기간별 등락률을 보여주는 대시보드
 *
 * @file Market Dashboard Page
 * @description Dashboard showing real-time prices, asset list, and period changes
 */
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMarketPrices, useAssets, usePeriodChanges } from '@/hooks/useMarket';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import AssetList from '@/components/market/AssetList';
import MarketIndexSummary from '@/components/market/MarketIndexSummary';
import MarketTicker from '@/components/market/MarketTicker';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import SpotlightSearch from '@/components/market/SpotlightSearch';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { AssetListSkeleton } from '@/components/ui/Skeleton';
import ServiceError from '@/components/ui/ServiceError';
import { cn } from '@/lib/format';
import type { Asset, AssetInfo, PriceUpdate } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { data: rawPrices, isLoading: pricesLoading, error: pricesError, refetch } = useMarketPrices();
  const { data: assetInfos } = useAssets();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [search] = useState('');
  const [livePrices, setLivePrices] = useState<Record<string, PriceUpdate>>({});
  const [activeMainTab, setActiveMainTab] = useState('realtime');
  const [period, setPeriod] = useState('realtime');
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // / 키 또는 헤더 검색 클릭으로 스포트라이트 열기
  // Open spotlight via / key or header search click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        setSpotlightOpen(true);
      }
    };
    const handleSpotlightEvent = () => setSpotlightOpen(true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-spotlight', handleSpotlightEvent);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-spotlight', handleSpotlightEvent);
    };
  }, []);

  const { data: periodChanges } = usePeriodChanges(period);

  const mainTabs = [
    { key: 'realtime', label: t('market.realtimeChart') },
    { key: 'popular', label: t('market.popular') },
    { key: 'trending', label: t('market.trending') },
  ];

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

  const periodChangeMap = useMemo(() => {
    const map: Record<string, { changePercent: number; changeAmount: number }> = {};
    if (periodChanges) {
      for (const pc of periodChanges) {
        map[pc.symbol] = { changePercent: pc.changePercent, changeAmount: pc.changeAmount };
      }
    }
    return map;
  }, [periodChanges]);

  const displayAssets = useMemo(() => {
    let result = assets.map((asset) => {
      const live = livePrices[asset.symbol];
      let display = live
        ? { ...asset, currentPrice: live.price, price: live.price, changePercent: live.changePercent ?? asset.changePercent, changeAmount: live.changeAmount ?? asset.changeAmount }
        : asset;

      if (period !== 'realtime') {
        const pc = periodChangeMap[asset.symbol];
        if (pc) {
          display = { ...display, changePercent: pc.changePercent, changeAmount: pc.changeAmount };
        }
      }

      return display;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.symbol.toLowerCase().includes(q) || (a.name ?? '').toLowerCase().includes(q));
    }
    return result;
  }, [assets, livePrices, search, period, periodChangeMap]);

  if (pricesError) {
    return <ServiceError onRetry={refetch} />;
  }

  return (
    <div>
      {!pricesLoading && displayAssets.length > 0 && (
        <>
          <MarketIndexSummary assets={displayAssets} />
          <MarketTicker assets={displayAssets} />
          <ExchangeRateBar />
        </>
      )}

      <div className="flex items-end gap-4 sm:gap-7 pt-7 pb-0 border-b border-border">
        {mainTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveMainTab(tab.key)}
            className={cn(
              'pb-3.5 text-[14px] sm:text-[15px] font-bold transition-colors relative whitespace-nowrap',
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
        <span className="ml-auto mb-2.5 hidden sm:inline-flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-400">{t('filter.crypto')}: Binance</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rise/10 border border-rise/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rise animate-pulse" />
            <span className="text-[10px] font-semibold text-rise/80">{t('filter.stock')}: {t('market.simulatedData')}</span>
          </span>
        </span>
      </div>

      {pricesLoading ? (
        <AssetListSkeleton />
      ) : (
        <AssetList
          assets={displayAssets}
          period={period}
          onPeriodChange={setPeriod}
          mainTab={activeMainTab}
          onLoginRequired={() => setLoginModalOpen(true)}
        />
      )}

      {/* 스포트라이트 검색 모달 / Spotlight search modal */}
      <SpotlightSearch
        isOpen={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
        assets={displayAssets}
        onLoginRequired={() => setLoginModalOpen(true)}
      />

      {/* 로그인 필요 모달 / Login required modal */}
      <ConfirmModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onConfirm={() => { setLoginModalOpen(false); router.push('/login'); }}
        title={t('modal.loginRequired')}
        message={t('modal.loginRequiredMessage')}
        confirmLabel={t('modal.loginConfirm')}
      />
    </div>
  );
}
