/**
 * @file 뉴스 페이지
 * @description 암호화폐, 국내주식, 해외주식 카테고리별 뉴스 조회 페이지 (검색, 날짜 필터, 페이지네이션)
 *
 * @file News Page
 * @description News browsing page with crypto, domestic stock, and foreign stock categories (search, date filter, pagination)
 */
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, ExternalLink, Newspaper, Search, Calendar } from 'lucide-react';
import { useNews, useScrapeStatus, useTriggerScrape } from '@/hooks/useNews';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import Pagination from '@/components/ui/Pagination';
import { cn } from '@/lib/format';

type NewsTab = 'CRYPTO' | 'DOMESTIC_STOCK' | 'FOREIGN_STOCK';

// 필터 적용 시 클라이언트 측 페이지네이션을 위한 대량 조회 한도 / Large batch fetch limit for client-side pagination when filtered
const FILTERED_FETCH_LIMIT = 200;

export default function NewsPage() {
  const { t } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);
  const dateLocale = locale === 'ko' ? 'ko-KR' : 'en-US';

  // 카테고리 탭 상태 (암호화폐, 국내주식, 해외주식) / Category tab state (crypto, domestic, foreign)
  const [activeTab, setActiveTabRaw] = useState<NewsTab>('CRYPTO');
  const setActiveTab = useCallback((v: NewsTab) => { setActiveTabRaw(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  // 페이지네이션 상태 / Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 검색 및 날짜 필터 상태 / Search and date filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('24h');

  const isFiltered = searchQuery.trim() !== '' || dateFilter !== 'all';

  /**
   * 필터 적용 시 대량 조회 후 클라이언트 측 페이지네이션, 아닐 때 서버 측 페이지네이션
   * When filtered: fetch large batch for client-side pagination; otherwise: server-side pagination
   */
  const apiPage = isFiltered ? 1 : page;
  const apiLimit = isFiltered ? FILTERED_FETCH_LIMIT : pageSize;

  const { data, isLoading } = useNews({ category: activeTab, page: apiPage, limit: apiLimit });

  // 검색/날짜 필터 변경 시 페이지 초기화 / Reset page when search or date filter changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, dateFilter]);

  // 뉴스 스크래핑 상태 및 수동 트리거 / News scrape status and manual trigger
  const { data: scrapeStatusList } = useScrapeStatus();
  const triggerScrape = useTriggerScrape();

  const tabs: { key: NewsTab; label: string }[] = [
    { key: 'CRYPTO', label: t('news.crypto') },
    { key: 'DOMESTIC_STOCK', label: t('news.domesticStock') },
    { key: 'FOREIGN_STOCK', label: t('news.foreignStock') },
  ];

  const currentScrapeStatus = scrapeStatusList?.find(
    (s) => s.category === activeTab,
  );

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

  // 날짜 필터에 해당하는 기준 시점 계산 / Calculate date cutoff for the selected filter
  const getDateCutoff = () => {
    if (dateFilter === 'all') return null;
    const now = new Date();
    if (dateFilter === '24h') return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (dateFilter === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  };

  // 검색어 + 날짜 기준 클라이언트 필터링 / Client-side filtering by search query + date
  const filteredItems = useMemo(() => (data?.items ?? []).filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (q && !item.title.toLowerCase().includes(q) && !(item.summary?.toLowerCase().includes(q))) {
      return false;
    }
    const cutoff = getDateCutoff();
    if (cutoff) {
      const itemDate = new Date(item.publishedAt || item.scrapedAt);
      if (itemDate < cutoff) return false;
    }
    return true;
  }), [data?.items, searchQuery, dateFilter]);

  // 필터 적용 시 클라이언트 측 슬라이싱 페이지네이션 / Client-side slice pagination for filtered results
  const displayItems = isFiltered
    ? filteredItems.slice((page - 1) * pageSize, page * pageSize)
    : filteredItems;

  const paginationTotal = isFiltered ? filteredItems.length : (data?.total ?? 0);
  const paginationTotalPages = isFiltered
    ? Math.ceil(filteredItems.length / pageSize)
    : (data?.totalPages ?? 0);

  const handleRefresh = () => {
    if (!triggerScrape.isPending) {
      triggerScrape.mutate(activeTab);
    }
  };

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

  const formatTimeAgo = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString(dateLocale, {
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
      <div className="py-6 flex items-center gap-2.5 h-[88px]">
        <Newspaper className="w-5 h-5 text-accent" />
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('news.title')}
        </h1>
      </div>

      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-border mb-5">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
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

        <div className="flex items-center gap-2 text-[12px] text-text-quaternary pb-1">
          {currentScrapeStatus && (
            <span className="hidden sm:inline">
              {t('news.lastScraped')}: {formatTimeAgo(currentScrapeStatus.scrapedAt)}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={triggerScrape.isPending}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors disabled:opacity-50"
            title={t('news.lastScraped')}
          >
            <RefreshCw
              className={cn(
                'w-3.5 h-3.5',
                triggerScrape.isPending && 'animate-spin',
              )}
            />
          </button>
        </div>
      </div>

      {/* Search + Date filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('news.search')}
            className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
          />
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
                'transition-colors cursor-pointer group',
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
    </div>
  );
}
