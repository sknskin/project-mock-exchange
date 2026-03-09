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

/** 마켓 대시보드 페이지 컴포넌트 — 실시간 시세, 종목 목록, AI 분석
 * Market dashboard page component — real-time prices, asset list, and AI insights */
export default function DashboardPage() {
  const router = useRouter();

  // 시세 데이터 및 종목 정보 조회 / Fetch market prices and asset info
  const { data: rawPrices, isLoading: pricesLoading, error: pricesError, refetch } = useMarketPrices();
  const { data: assetInfos } = useAssets();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // 실시간 WebSocket 가격 업데이트 저장소 / Live WebSocket price update store
  const [livePrices, setLivePrices] = useState<Record<string, PriceUpdate>>({});
  // 메인 탭 상태 (실시간, 인기, 급상승, 관심종목) / Main tab state (realtime, popular, trending, watchlist)
  const [activeMainTab, setActiveMainTab] = useState('realtime');
  // 기간 필터 (실시간, 1일, 1주 등) / Period filter (realtime, 1d, 1w, etc.)
  const [period, setPeriod] = useState('realtime');
  // 스포트라이트 검색 모달 상태 / Spotlight search modal state
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  // 로그인 필요 모달 상태 / Login required modal state
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

  // 기간별 등락률 데이터 조회 / Fetch period-based change data
  const { data: periodChanges } = usePeriodChanges(period);

  // 관심종목 데이터 및 토글 뮤테이션 / Watchlist data and toggle mutations
  const { data: watchlistSymbols } = useWatchlist();
  const addWatchlist = useAddWatchlist();
  const removeWatchlist = useRemoveWatchlist();

  /**
   * 관심종목 토글 핸들러 — 미인증 시 로그인 모달 표시
   * Watchlist toggle handler — shows login modal if unauthenticated
   */
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

  /**
   * 메인 탭 전환 — 관심종목 탭은 로그인 필요, 전환 시 상단으로 스크롤
   * Main tab change — watchlist requires login, scrolls to top on switch
   */
  const handleMainTabChange = useCallback((key: string) => {
    if (key === 'watchlist' && !isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    setActiveMainTab(key);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isAuthenticated]);

  const mainTabs = [
    { key: 'realtime', label: t('market.realtimeChart') },
    { key: 'popular', label: t('market.popular') },
    { key: 'trending', label: t('market.trending') },
    { key: 'watchlist', label: t('market.watchlist') },
  ];

  // 종목명/유형 빠른 조회를 위한 심볼 맵 / Symbol-to-info map for fast lookup
  const assetMap = useMemo(() => {
    const map: Record<string, AssetInfo> = {};
    if (assetInfos) {
      for (const info of assetInfos as AssetInfo[]) map[info.symbol] = info;
    }
    return map;
  }, [assetInfos]);

  /**
   * REST API 가격 데이터와 종목 정보를 결합하여 Asset 배열 생성
   * Merge REST price data with asset info to create Asset array
   */
  const assets = useMemo(() => {
    if (!rawPrices) return [];
    return (rawPrices as Omit<Asset, 'name' | 'type' | 'currentPrice' | 'changePercent' | 'changeAmount'>[]).map((p): Asset => {
      const info = assetMap[p.symbol];
      return { ...p, name: info?.name ?? p.symbol, type: info?.assetType ?? 'CRYPTO', currentPrice: p.price, changePercent: p.changePercent24h ?? 0, changeAmount: p.change24h ?? 0 };
    });
  }, [rawPrices, assetMap]);

  // WebSocket 구독 심볼 목록 추출 / Extract symbol list for WebSocket subscription
  const symbols = useMemo(() => assets.map((a) => a.symbol), [assets]);
  // WebSocket 실시간 가격 콜백 / WebSocket real-time price callback
  const handlePriceUpdate = useCallback((update: PriceUpdate) => {
    setLivePrices((prev) => ({ ...prev, [update.symbol]: update }));
  }, []);
  useWebSocket(symbols, handlePriceUpdate);

  // 기간별 등락 데이터를 심볼별 맵으로 변환 / Convert period changes to per-symbol map
  const periodChangeMap = useMemo(() => {
    const map: Record<string, { changePercent: number; changeAmount: number }> = {};
    if (periodChanges) {
      for (const pc of periodChanges) {
        map[pc.symbol] = { changePercent: pc.changePercent, changeAmount: pc.changeAmount };
      }
    }
    return map;
  }, [periodChanges]);

  /**
   * 표시용 자산 목록 — WebSocket 실시간 가격 + 기간별 등락률 오버레이
   * Display assets — overlays WebSocket live prices + period change rates
   */
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

  // 관심종목 탭일 때 워치리스트 필터 적용 / Apply watchlist filter when on watchlist tab
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
      {/* 모바일 검색 바 — lg 이상에서는 숨김 / Mobile search bar — hidden on lg+ */}
      <div className="lg:hidden pt-2 pb-1">
        <button
          onClick={() => setSpotlightOpen(true)}
          className="w-full flex items-center gap-2.5 bg-bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-[13px] text-text-quaternary transition-colors hover:border-border/80"
        >
          <Search className="w-4 h-4" />
          <span>{t('nav.searchPlaceholder')}</span>
        </button>
      </div>

      {/* 시장 지수 마키 — Yahoo Finance 실제 데이터 / Market index marquee — real Yahoo Finance data */}
      <MarketIndexSummary />

      {/* 시장 요약 영역 — 티커, 환율 바 / Market summary — ticker, exchange rate bar */}
      {!pricesLoading && displayAssets.length > 0 && (
        <>
          <MarketTicker assets={displayAssets} />
          <ExchangeRateBar />
        </>
      )}

      {/* 메인 탭 바 — 접근성: role="tablist", aria-selected / Main tab bar — a11y: tablist + aria-selected */}
      <div className="flex items-end gap-3 sm:gap-5 md:gap-7 pt-7 pb-0 border-b border-border overflow-x-auto scrollbar-hide" role="tablist">
        {mainTabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeMainTab === tab.key}
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
        {/* 데이터 출처 배지 — 데스크탑에서만 표시 / Data source badges — desktop only */}
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

      {/* 종목 목록 — 로딩 시 스켈레톤, 완료 시 AssetList / Asset list — skeleton on loading, AssetList when ready */}
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
