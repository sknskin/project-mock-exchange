/**
 * @file 뉴스 페이지
 * @description 암호화폐, 국내주식, 해외주식 카테고리별 뉴스 조회 페이지 (검색, 날짜 필터, 페이지네이션)
 *
 * @file News Page
 * @description News browsing page with crypto, domestic stock, and foreign stock categories (search, date filter, pagination)
 */
'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExternalLink, Newspaper, Search, Sparkles, X, Loader2 } from 'lucide-react';
import { useNews } from '@/hooks/useNews';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryClient } from '@tanstack/react-query';
import { useSettingsStore } from '@/stores/settings';
import Pagination from '@/components/ui/Pagination';
import RefreshControl from '@/components/ui/RefreshControl';
// BD-M-05: 인라인 AI 모달을 공용 컴포넌트로 대체 / Replace inline AI modal with shared component
import AiAnalysisModal from '@/components/ui/AiAnalysisModal';
import api from '@/lib/api';
import { cn } from '@/lib/format';

type NewsTab = 'CRYPTO' | 'DOMESTIC_STOCK' | 'FOREIGN_STOCK';

// AI 분석 시 최근 뉴스 조회 한도 (실제 사용량: 최대 50건) / AI analysis fetch limit (actual usage: max 50 items)
const AI_ANALYSIS_FETCH_LIMIT = 50;

/** NAV-M-03: Suspense 래퍼 — useSearchParams 사용을 위해 필요
 * NAV-M-03: Suspense wrapper — required for useSearchParams usage in Next.js 15 */
export default function NewsPageWrapper() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-text-quaternary animate-pulse">Loading...</div>}>
      <NewsPage />
    </Suspense>
  );
}

function NewsPage() {
  const { t } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);
  const dateLocale = locale === 'ko' ? 'ko-KR' : 'en-US';
  const router = useRouter();
  const searchParams = useSearchParams();

  // NAV-M-03: URL 파라미터에서 초기 탭 결정 / Determine initial tab from URL param
  const initialTab = (() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'DOMESTIC_STOCK' || tabParam === 'FOREIGN_STOCK') return tabParam;
    return 'CRYPTO' as const;
  })();

  // 카테고리 탭 상태 (암호화폐, 국내주식, 해외주식) / Category tab state (crypto, domestic, foreign)
  const [activeTab, setActiveTabRaw] = useState<NewsTab>(initialTab);
  // NAV-M-03: 탭 변경 시 URL 파라미터 동기화 — 딥링크 지원
  // NAV-M-03: Sync URL param on tab change — deep link support
  const setActiveTab = useCallback((v: NewsTab) => {
    setActiveTabRaw(v);
    const url = new URL(window.location.href);
    if (v === 'CRYPTO') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', v);
    }
    router.replace(url.pathname + url.search, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [router]);

  // 페이지네이션 상태 / Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 검색 입력 상태 (즉시 반영) 및 디바운스된 검색 쿼리 (API 호출용)
  // Search input state (immediate) and debounced search query (for API calls)
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('24h');

  // 검색 디바운스 — 300ms 후 쿼리 적용 (기존 DiscussionsTab 패턴 따름)
  // Debounced search — applies query after 300ms (follows existing DiscussionsTab pattern)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  // AI 분석 상태 / AI analysis state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ summary: string; highlights: string[]; sentiment: string; sectionAnalysis?: { title: string; content: string }[]; marketOutlook?: string; riskFactors?: string[] } | null>(null);
  const [aiError, setAiError] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  /**
   * 서버 사이드 필터링으로 검색어와 날짜 필터를 전달하여 필요한 데이터만 조회
   * Server-side filtering — pass keyword and date filter to fetch only required data
   */
  const { data, isLoading } = useNews({
    category: activeTab,
    page,
    limit: pageSize,
    keyword: searchQuery.trim() || undefined,
    dateFilter: dateFilter !== 'all' ? dateFilter : undefined,
  });

  // 검색/날짜 필터 변경 시 페이지 초기화 / Reset page when search or date filter changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, dateFilter]);

  // 쿼리 클라이언트 (수동 갱신용) / Query client for manual refresh
  const queryClient = useQueryClient();

  const tabs: { key: NewsTab; label: string }[] = [
    { key: 'CRYPTO', label: t('news.crypto') },
    { key: 'DOMESTIC_STOCK', label: t('news.domesticStock') },
    { key: 'FOREIGN_STOCK', label: t('news.foreignStock') },
  ];

  const handleTabChange = (tab: NewsTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const dateFilterOptions: { key: typeof dateFilter; label: string }[] = [
    { key: 'all', label: t('news.dateFilter.all') },
    { key: '24h', label: t('news.dateFilter.24h') },
    { key: '7d', label: t('news.dateFilter.7d') },
    { key: '30d', label: t('news.dateFilter.30d') },
  ];

  // 서버 사이드 필터링 결과를 그대로 사용 / Use server-side filtered results directly
  const displayItems = data?.items ?? [];
  const paginationTotal = data?.total ?? 0;
  const paginationTotalPages = data?.totalPages ?? 0;

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['news'] });
  }, [queryClient]);

  const handleAiAnalysis = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError(false);
    setAiResult(null);
    setAiModalOpen(true);
    try {
      // 최근 24시간 뉴스만 조회 (AI 분석에 필요한 최대 50건) — 과잉 조회 방지
      // Fetch only recent 24h news (max 50 for AI analysis) — prevents over-fetching
      const newsPromise = api.get('/api/news', { params: { category: activeTab, page: 1, limit: AI_ANALYSIS_FETCH_LIMIT, dateFilter: '24h' } });

      const { data: newsData } = await newsPromise;
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
        category: activeTab,
        newsItems: recentItems,
        locale,
      }, { timeout: 60000 });
      // 응답이 { summary, highlights, sentiment } 또는 래핑된 형태일 수 있음
      // Response may be { summary, highlights, sentiment } or wrapped
      const raw = result?.data ?? result;
      const parsed = raw?.summary ? raw : raw?.data ?? raw;
      // 빈 응답 처리 / Handle empty response
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
  }, [activeTab, aiLoading, locale]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="py-6 flex items-center justify-between h-[88px]">
        <div className="flex items-center gap-2.5">
          {/* A11Y-L-04: 장식용 아이콘 aria-hidden / Decorative icon aria-hidden */}
          <Newspaper className="w-5 h-5 text-accent" aria-hidden="true" />
          <h1 className="text-[20px] font-extrabold text-text-primary">
            {t('news.title')}
          </h1>
        </div>
        <RefreshControl intervalSeconds={60} onRefresh={handleRefresh} />
      </div>

      {/* Tab bar */}
      {/* A11Y-M-03: 인라인 탭에 role="tablist"/role="tab" 추가 — 접근성 / Add tablist/tab roles for inline tabs — a11y */}
      <div className="flex items-center border-b border-border mb-5">
        <div className="flex flex-1" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'relative px-4 py-2.5 text-[13px] sm:text-[14px] font-semibold transition-colors',
                activeTab === tab.key
                  ? 'text-accent'
                  : 'text-text-tertiary hover:text-text-primary',
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-t" />
              )}
            </button>
          ))}
        </div>
        {/* AI 분석 버튼 — 탭 섹션 최우측 / AI Analysis button — rightmost in tab section */}
        <button
          onClick={handleAiAnalysis}
          disabled={aiLoading}
          className={cn(
            'flex items-center justify-center gap-2 h-10 sm:min-w-[120px] px-4 rounded-xl text-[13px] font-semibold transition-all duration-150 border shrink-0 ml-auto mb-1',
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
          {t('news.aiAnalysis')}
        </button>
      </div>

      {/* Search + Date filter + AI Analysis */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('news.search')}
            aria-label={t('news.search')}
            className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-9 py-2.5 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); setSearchQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-text-quaternary hover:text-text-primary transition-colors" aria-label={t('common.clearSearch')}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {dateFilterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { setDateFilter(opt.key); setPage(1); }}
              className={cn(
                'px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap',
                dateFilter === opt.key
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-quaternary hover:text-text-tertiary',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* News list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-bg-secondary animate-pulse"
            />
          ))}
        </div>
      ) : !data || displayItems.length === 0 ? (
        <div className="py-24 text-center">
          <Newspaper className="w-10 h-10 mx-auto mb-3 text-text-quaternary" />
          <p className="text-text-quaternary text-[14px]">
            {t('news.noItems')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item) => (
            <a
              key={item.id}
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'block p-4 rounded-xl border border-border',
                'bg-bg-secondary hover:bg-bg-tertiary hover:border-accent/40',
                // ANI-L-05: 뉴스 항목 페이드인 / News item fade-in
                'transition-colors cursor-pointer group animate-fade-in',
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-[15px] font-semibold text-text-primary leading-snug line-clamp-1 flex-1">
                  {item.title}
                </h2>
                <ExternalLink className="w-3.5 h-3.5 text-text-quaternary shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {item.summary && (
                <p className="text-[13px] text-text-tertiary leading-relaxed line-clamp-2 mb-2.5">
                  {item.summary}
                </p>
              )}

              <div className="flex items-center gap-2 text-[12px] text-text-quaternary">
                <span className="font-medium text-text-tertiary">
                  {item.source}
                </span>
                <span>·</span>
                <span>
                  {item.publishedAt
                    ? formatDate(item.publishedAt)
                    : formatDate(item.scrapedAt)}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && paginationTotalPages > 0 && (
        <Pagination
          page={page}
          totalPages={paginationTotalPages}
          total={paginationTotal}
          limit={pageSize}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(n) => { setPageSize(n); setPage(1); }}
        />
      )}

      {/* BD-M-05: 인라인 AI 모달을 공용 AiAnalysisModal 컴포넌트로 대체
          BD-M-05: Replace inline AI modal with shared AiAnalysisModal component */}
      <AiAnalysisModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        loading={aiLoading}
        error={aiError}
        result={aiResult}
        categoryLabel={tabs.find((tab) => tab.key === activeTab)?.label}
      />
    </div>
  );
}
