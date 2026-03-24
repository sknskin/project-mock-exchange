/**
 * @file 마켓 대시보드 페이지
 * @description 실시간 시세, 종목 목록, 기간별 등락률을 보여주는 대시보드 (하위 컴포넌트 조합)
 *
 * @file Market Dashboard Page
 * @description Dashboard showing real-time prices, asset list, and period changes (composes sub-components)
 *
 * BD-H-01: 516줄 단일 컴포넌트를 하위 컴포넌트로 분할하여 유지보수성 향상
 * BD-H-01: Split 516-line monolithic component into sub-components for better maintainability
 *   - DashboardMobileSearch: 모바일 검색 바 / Mobile search bar
 *   - DashboardMarketSummary: 시장 지수, 티커, 환율 / Market index, ticker, exchange rate
 *   - DashboardTabBar: 메인 탭 바 / Main tab bar
 *   - DashboardAssetSection: 종목 목록 + AI 버튼 / Asset list + AI button
 *   - DashboardAiModal: AI 시장 분석 모달 / AI market analysis modal
 */
'use client';

import { useState, useMemo, useCallback, useEffect, useRef, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useMarketPrices, useAssets, usePeriodChanges } from '@/hooks/useMarket';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { useWatchlist, useAddWatchlist, useRemoveWatchlist } from '@/hooks/useWatchlist';
import SpotlightSearch from '@/components/market/SpotlightSearch';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ServiceError from '@/components/ui/ServiceError';
import DashboardMobileSearch from '@/components/dashboard/DashboardMobileSearch';
import DashboardMarketSummary from '@/components/dashboard/DashboardMarketSummary';
import DashboardTabBar from '@/components/dashboard/DashboardTabBar';
import DashboardAssetSection from '@/components/dashboard/DashboardAssetSection';
import DashboardAiModal from '@/components/dashboard/DashboardAiModal';
import type { AiAnalysisResult } from '@/components/dashboard/DashboardAiModal';
import { cn } from '@/lib/format';
import { Sparkles, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import type { Asset, AssetInfo, PriceUpdate } from '@/types';

// AI 분석 시 최근 뉴스 조회 한도 / AI analysis news fetch limit
const AI_ANALYSIS_FETCH_LIMIT = 50;

/** 마켓 대시보드 페이지 컴포넌트 — 하위 컴포넌트를 조합하는 오케스트레이터
 * Market dashboard page component — thin orchestrator composing sub-components */
export default function DashboardPage() {
  const router = useRouter();

  // 시세 데이터 및 종목 정보 조회 / Fetch market prices and asset info
  const { data: rawPrices, isLoading: pricesLoading, error: pricesError, refetch } = useMarketPrices();
  const { data: assetInfos } = useAssets();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // 실시간 WebSocket 가격 업데이트 저장소 (500ms 배치) / Live WebSocket price update store (500ms batching)
  const [livePrices, setLivePrices] = useState<Record<string, PriceUpdate>>({});
  const pendingPricesRef = useRef<Record<string, PriceUpdate>>({});
  const flushTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // 메인 탭 상태 (실시간, 인기, 급상승, 관심종목) / Main tab state (realtime, popular, trending, watchlist)
  const [activeMainTab, setActiveMainTab] = useState('realtime');
  // 기간 필터 (실시간, 1일, 1주 등) / Period filter (realtime, 1d, 1w, etc.)
  const [period, setPeriod] = useState('realtime');
  // 스포트라이트 검색 모달 상태 / Spotlight search modal state
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  // 로그인 필요 모달 상태 / Login required modal state
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  // AI 분석 상태 / AI analysis state
  const locale = useSettingsStore((s) => s.locale);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [aiError, setAiError] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // WebSocket 배치 타이머 정리 / Cleanup WebSocket batch timer
  useEffect(() => {
    return () => { if (flushTimerRef.current) clearTimeout(flushTimerRef.current); };
  }, []);

  // AI 분석 모달 Escape 키 닫기 / Close AI modal on Escape key
  useEffect(() => {
    if (!aiModalOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !aiLoading) {
        setAiModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [aiModalOpen, aiLoading]);

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

  /** AI 시장 분석 핸들러 / AI market analysis handler */
  const handleAiAnalysis = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError(false);
    setAiResult(null);
    setAiModalOpen(true);
    try {
      // 최근 24시간 뉴스만 50건 조회 (AI 분석에 필요한 만큼만) — 과잉 조회 방지
      // Fetch only 50 recent 24h news (just enough for AI analysis) — prevents over-fetching
      const { data: newsData } = await api.get('/api/news', { params: { category: 'CRYPTO', page: 1, limit: AI_ANALYSIS_FETCH_LIMIT, dateFilter: '24h' } });
      const items = newsData?.data?.items ?? newsData?.items ?? [];
      const allItems = items as { title: string; summary: string | null; source: string; publishedAt: string | null; scrapedAt: string }[];
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentItems = allItems
        .filter((item) => new Date(item.publishedAt || item.scrapedAt) >= cutoff && item.title && item.source)
        .slice(0, 50)
        .map((item) => ({ title: item.title, summary: item.summary || undefined, source: item.source, publishedAt: item.publishedAt || undefined }));

      if (!recentItems.length) {
        setAiResult(null);
        setAiLoading(false);
        return;
      }

      const { data: result } = await api.post('/api/ai/news-summary', {
        category: 'CRYPTO',
        newsItems: recentItems,
        locale,
      }, { timeout: 60000 });
      const raw = result?.data ?? result;
      const parsed = raw?.summary ? raw : raw?.data ?? raw;
      if (parsed && typeof parsed.summary === 'string' && parsed.summary.length > 0) {
        setAiResult(parsed);
      } else {
        setAiResult(null);
      }
    } catch {
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, locale]);

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
  // WebSocket 실시간 가격 콜백 — 500ms 배치로 과도한 렌더 방지
  // WebSocket real-time price callback — batches updates every 500ms to prevent excessive re-renders
  const handlePriceUpdate = useCallback((update: PriceUpdate) => {
    pendingPricesRef.current[update.symbol] = update;
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => {
        const batch = pendingPricesRef.current;
        pendingPricesRef.current = {};
        flushTimerRef.current = undefined;
        // startTransition: 가격 업데이트를 낮은 우선순위로 처리 → 입력 등 사용자 상호작용이 먼저 처리됨
        // startTransition: process price updates at low priority → user interactions (typing, etc.) take precedence
        startTransition(() => {
          setLivePrices((prev) => ({ ...prev, ...batch }));
        });
      }, 500);
    }
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
   * PF-M-03: displayAssets + filteredDisplayAssets를 단일 useMemo로 병합
   * PF-M-03: Merge displayAssets + filteredDisplayAssets into a single useMemo
   * WebSocket 실시간 가격 + 기간별 등락률 오버레이 + 관심종목 필터 적용
   * Overlays WebSocket live prices + period change rates + watchlist filter
   */
  const displayAssets = useMemo(() => {
    const watchlistSet = activeMainTab === 'watchlist' && watchlistSymbols ? new Set(watchlistSymbols) : null;

    const result = assets.map((asset) => {
      const live = livePrices[asset.symbol];
      let display = live
        ? {
            ...asset,
            currentPrice: live.price,
            price: live.price,
            changePercent: live.changePercent ?? asset.changePercent,
            changeAmount: live.changeAmount ?? asset.changeAmount,
            volume: live.volume || asset.volume,
            high24h: live.high24h || asset.high24h,
            low24h: live.low24h || asset.low24h,
          }
        : asset;

      if (period !== 'realtime') {
        const pc = periodChangeMap[asset.symbol];
        if (pc) {
          display = { ...display, changePercent: pc.changePercent, changeAmount: pc.changeAmount };
        }
      }

      return display;
    });

    // 관심종목 탭일 때 워치리스트 필터 적용 / Apply watchlist filter when on watchlist tab
    if (watchlistSet) {
      return result.filter((a) => watchlistSet.has(a.symbol));
    }
    return result;
  }, [assets, livePrices, period, periodChangeMap, activeMainTab, watchlistSymbols]);

  // PF-M-03: filteredDisplayAssets를 displayAssets로 통합 — 하위 호환을 위한 별칭
  // PF-M-03: Merged into displayAssets — alias for backward compatibility
  const filteredDisplayAssets = displayAssets;

  if (pricesError) {
    return <ServiceError onRetry={refetch} />;
  }

  // AI 분석 버튼 — AssetList에 전달 / AI analysis button — passed to AssetList
  const aiButton = (
    <button
      onClick={handleAiAnalysis}
      disabled={aiLoading}
      className={cn(
        'flex items-center justify-center gap-1.5 h-[34px] px-3.5 rounded-xl text-[13px] font-semibold transition-all duration-150 border shrink-0',
        aiLoading
          ? 'border-border text-text-quaternary cursor-not-allowed'
          : 'border-accent/30 text-accent hover:bg-accent/10',
      )}
    >
      {aiLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        <Sparkles className="w-4 h-4 shrink-0" />
      )}
      {t('dashboard.aiAnalysis')}
    </button>
  );

  return (
    <div>
      {/* 모바일 검색 바 / Mobile search bar */}
      <DashboardMobileSearch onOpen={() => setSpotlightOpen(true)} />

      {/* 시장 요약 (지수, 티커, 환율) / Market summary (index, ticker, exchange rate) */}
      <DashboardMarketSummary pricesLoading={pricesLoading} displayAssets={displayAssets} />

      {/* 메인 탭 바 / Main tab bar */}
      <DashboardTabBar activeMainTab={activeMainTab} onTabChange={handleMainTabChange} />

      {/* 종목 목록 섹션 / Asset list section */}
      <DashboardAssetSection
        pricesLoading={pricesLoading}
        assets={filteredDisplayAssets}
        period={period}
        onPeriodChange={setPeriod}
        mainTab={activeMainTab}
        onLoginRequired={() => setLoginModalOpen(true)}
        watchlistSymbols={watchlistSymbols}
        onToggleWatchlist={handleToggleWatchlist}
        aiButton={aiButton}
      />

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

      {/* AI 시장 분석 모달 / AI market analysis modal */}
      <DashboardAiModal
        isOpen={aiModalOpen}
        onClose={() => !aiLoading && setAiModalOpen(false)}
        loading={aiLoading}
        error={aiError}
        result={aiResult}
      />
    </div>
  );
}
