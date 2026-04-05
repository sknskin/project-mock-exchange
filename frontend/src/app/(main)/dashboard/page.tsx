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

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useMarketPrices, useAssets, usePeriodChanges } from '@/hooks/useMarket';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { batchUpdatePrices } from '@/stores/livePrice';
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
import { Sparkles, Loader2, LayoutDashboard } from 'lucide-react';
import api from '@/lib/api';
import type { Asset, AssetInfo, PriceUpdate } from '@/types';

// UX-M-02: 마지막 업데이트 시간 표시 함수 / Format last updated timestamp
function formatLastUpdated(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// PERF-13-07: 마지막 업데이트 시각을 별도 컴포넌트로 분리 — 대시보드 전체 리렌더 방지
// PERF-13-07: Separate last-updated display into its own component — prevents full dashboard re-render
function LastUpdatedDisplay({ lastUpdatedRef }: { lastUpdatedRef: React.RefObject<Date | null> }) {
  const { t } = useTranslation();
  const [, forceUpdate] = useState(0);
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      if (displayRef.current && lastUpdatedRef.current) {
        displayRef.current.textContent =
          `${t('dashboard.lastUpdated') ?? 'Last updated'}: ${formatLastUpdated(lastUpdatedRef.current)}`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [lastUpdatedRef, t]);

  // 초기 표시를 위해 ref 값이 생기면 한 번 forceUpdate
  // Force one update when ref value first appears for initial display
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastUpdatedRef.current) {
        forceUpdate((c) => c + 1);
        clearInterval(timer);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [lastUpdatedRef]);

  if (!lastUpdatedRef.current) return null;

  return (
    <div className="flex justify-end pt-2 pb-1">
      <span ref={displayRef} className="text-[11px] text-text-quaternary tabular-nums">
        {t('dashboard.lastUpdated') ?? 'Last updated'}: {formatLastUpdated(lastUpdatedRef.current)}
      </span>
    </div>
  );
}

// AI 분석 시 최근 뉴스 조회 한도 / AI analysis news fetch limit
const AI_ANALYSIS_FETCH_LIMIT = 50;

/** 마켓 대시보드 페이지 컴포넌트 — 하위 컴포넌트를 조합하는 오케스트레이터
 * Market dashboard page component — thin orchestrator composing sub-components */
/** NAV-M-02: Suspense 래퍼 — useSearchParams 사용을 위해 필요
 * NAV-M-02: Suspense wrapper — required for useSearchParams in Next.js 15 */
export default function DashboardPageWrapper() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-text-quaternary animate-pulse">Loading...</div>}>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 시세 데이터 및 종목 정보 조회 / Fetch market prices and asset info
  const { data: rawPrices, isLoading: pricesLoading, error: pricesError, refetch } = useMarketPrices();
  const { data: assetInfos } = useAssets();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // 실시간 가격은 React 외부 스토어에 저장 — 대시보드 컴포넌트 리렌더 완전 방지
  // Live prices in external store — completely prevents dashboard component re-render
  const pendingPricesRef = useRef<Record<string, PriceUpdate>>({});
  const flushTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // PERF-13-07: useRef로 변경 — 대시보드 전체 리렌더 방지
  // PERF-13-07: Changed to useRef — prevents full dashboard re-render
  const lastUpdatedRef = useRef<Date | null>(null);
  // NAV-M-02: URL 파라미터에서 초기 탭/기간 결정 — 딥링크 지원
  // NAV-M-02: Determine initial tab/period from URL params — deep link support
  const validTabs = ['realtime', 'popular', 'trending', 'watchlist'];
  const validPeriods = ['realtime', '1d', '1w', '1m', '3m', '6m', '1y'];
  const initialTab = (() => {
    const p = searchParams.get('tab');
    return p && validTabs.includes(p) ? p : 'realtime';
  })();
  const initialPeriod = (() => {
    const p = searchParams.get('period');
    return p && validPeriods.includes(p) ? p : 'realtime';
  })();
  // 메인 탭 상태 (실시간, 인기, 급상승, 관심종목) / Main tab state (realtime, popular, trending, watchlist)
  const [activeMainTab, setActiveMainTab] = useState(initialTab);
  // 기간 필터 (실시간, 1일, 1주 등) / Period filter (realtime, 1d, 1w, etc.)
  const [period, setPeriod] = useState(initialPeriod);
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
    // NAV-M-02: URL 파라미터 동기화 — 탭 변경 시 / Sync URL params on tab change
    const url = new URL(window.location.href);
    if (key === 'realtime') url.searchParams.delete('tab');
    else url.searchParams.set('tab', key);
    router.replace(url.pathname + url.search, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isAuthenticated, router]);

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
        batchUpdatePrices(batch);
        // UX-M-02: 마지막 업데이트 시각 갱신 / Update last refreshed timestamp
        lastUpdatedRef.current = new Date();
      }, 2000);
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
  // displayAssets — REST 데이터 + 기간별 등락률만 적용 (실시간 가격은 각 AssetListItem이 스토어에서 직접 구독)
  // displayAssets — REST data + period changes only (live prices are subscribed per-item from store)
  const displayAssets = useMemo(() => {
    const watchlistSet = activeMainTab === 'watchlist' && watchlistSymbols ? new Set(watchlistSymbols) : null;

    const result = assets.map((asset) => {
      if (period !== 'realtime') {
        const pc = periodChangeMap[asset.symbol];
        if (pc) {
          return { ...asset, changePercent: pc.changePercent, changeAmount: pc.changeAmount };
        }
      }
      return asset;
    });

    if (watchlistSet) {
      return result.filter((a) => watchlistSet.has(a.symbol));
    }
    return result;
  }, [assets, period, periodChangeMap, activeMainTab, watchlistSymbols]);

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
      {/* UX-9-32: 다른 페이지와 일관된 헤더 영역 추가 / Add consistent header area matching other pages */}
      <div className="py-6 flex items-center justify-between h-[88px]">
        <div className="flex items-center gap-2.5">
          <LayoutDashboard className="w-5 h-5 text-accent" aria-hidden="true" />
          <h1 className="text-[20px] font-extrabold text-text-primary">{t('nav.dashboard')}</h1>
        </div>
      </div>

      {/* UX-M-02: 마지막 데이터 갱신 시각 표시 / Last data refresh indicator */}
      {/* PERF-13-07: 별도 컴포넌트로 분리하여 대시보드 리렌더 방지 / Separated to prevent dashboard re-render */}
      <LastUpdatedDisplay lastUpdatedRef={lastUpdatedRef} />

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
