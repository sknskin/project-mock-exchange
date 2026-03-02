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
import { useWatchlist, useAddWatchlist, useRemoveWatchlist } from '@/hooks/useWatchlist';
import dynamic from 'next/dynamic';
const AiInsights = dynamic(() => import('@/components/trading/AiInsights'), { ssr: false });
import AssetList from '@/components/market/AssetList';
import MarketIndexSummary from '@/components/market/MarketIndexSummary';
import MarketTicker from '@/components/market/MarketTicker';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import SpotlightSearch from '@/components/market/SpotlightSearch';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { AssetListSkeleton } from '@/components/ui/Skeleton';
import ServiceError from '@/components/ui/ServiceError';
import { cn } from '@/lib/format';
import { Search } from 'lucide-react';
import type { Asset, AssetInfo, PriceUpdate } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { data: rawPrices, isLoading: pricesLoading, error: pricesError, refetch } = useMarketPrices();
  const { data: assetInfos } = useAssets();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
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

  const { data: watchlistSymbols } = useWatchlist();
  const addWatchlist = useAddWatchlist();
  const removeWatchlist = useRemoveWatchlist();

  const handleToggleWatchlist = useCallback((symbol: string) => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    if (watchlistSymbols?.includes(symbol)) {
      removeWatchlist.mutate(symbol);
    } else {
      addWatchlist.mutate(symbol);
    }
  }, [isAuthenticated, watchlistSymbols, addWatchlist, removeWatchlist]);

  const handleMainTabChange = useCallback((key: string) => {
    if (key === 'watchlist' && !isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    setActiveMainTab(key);
  }, [isAuthenticated]);

  const mainTabs = [
    { key: 'realtime', label: t('market.realtimeChart') },
    { key: 'popular', label: t('market.popular') },
    { key: 'trending', label: t('market.trending') },
    { key: 'watchlist', label: t('market.watchlist') },
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
    return (rawPrices as Omit<Asset, 'name' | 'type' | 'currentPrice' | 'changePercent' | 'changeAmount'>[]).map((p): Asset => {
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
    return result;
  }, [assets, livePrices, period, periodChangeMap]);

  const filteredDisplayAssets = useMemo(() => {
    if (activeMainTab === 'watchlist' && watchlistSymbols) {
      const set = new Set(watchlistSymbols);
      return displayAssets.filter((a) => set.has(a.symbol));
    }
    return displayAssets;
  }, [displayAssets, activeMainTab, watchlistSymbols]);

  if (pricesError) {
    return <ServiceError onRetry={refetch} />;
  }

  return (
    <div>
      {/* Mobile search bar */}
      <div className="lg:hidden pt-2 pb-1">
        <button
          onClick={() => setSpotlightOpen(true)}
          className="w-full flex items-center gap-2.5 bg-bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-[13px] text-text-quaternary transition-colors hover:border-border/80"
        >
          <Search className="w-4 h-4" />
          <span>{t('nav.searchPlaceholder')}</span>
        </button>
      </div>

      {!pricesLoading && displayAssets.length > 0 && (
        <>
          <MarketIndexSummary assets={displayAssets} />
          <MarketTicker assets={displayAssets} />
          <ExchangeRateBar />
        </>
      )}

      <div className="flex items-end gap-3 sm:gap-5 md:gap-7 pt-7 pb-0 border-b border-border overflow-x-auto scrollbar-hide">
        {mainTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleMainTabChange(tab.key)}
            className={cn(
              'pb-3.5 text-[13px] sm:text-[14px] md:text-[15px] font-bold transition-colors relative whitespace-nowrap shrink-0',
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
        <span className="ml-auto mb-2.5 hidden md:inline-flex items-center gap-2 shrink-0">
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
          assets={filteredDisplayAssets}
          period={period}
          onPeriodChange={setPeriod}
          mainTab={activeMainTab}
          onLoginRequired={() => setLoginModalOpen(true)}
          watchlistSymbols={watchlistSymbols}
          onToggleWatchlist={handleToggleWatchlist}
        />
      )}

      {/* AI 분석 / AI Insights */}
      <div className="mt-8">
        <AiInsights />
      </div>

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
