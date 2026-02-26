'use client';

import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, ExternalLink, Newspaper, Search, Calendar } from 'lucide-react';
import { useNews, useScrapeStatus, useTriggerScrape } from '@/hooks/useNews';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import Pagination from '@/components/ui/Pagination';
import { cn } from '@/lib/format';

type NewsTab = 'CRYPTO' | 'DOMESTIC_STOCK' | 'FOREIGN_STOCK';

const FILTERED_FETCH_LIMIT = 200;

export default function NewsPage() {
  const { t } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);
  const dateLocale = locale === 'ko' ? 'ko-KR' : 'en-US';
  const [activeTab, setActiveTab] = useState<NewsTab>('CRYPTO');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('24h');

  const isFiltered = searchQuery.trim() !== '' || dateFilter !== 'all';

  // When filtered, fetch a large batch for client-side pagination; otherwise use server-side pagination
  const apiPage = isFiltered ? 1 : page;
  const apiLimit = isFiltered ? FILTERED_FETCH_LIMIT : pageSize;

  const { data, isLoading } = useNews({ category: activeTab, page: apiPage, limit: apiLimit });

  // Reset page to 1 when search query or date filter changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, dateFilter]);

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

  const getDateCutoff = () => {
    if (dateFilter === 'all') return null;
    const now = new Date();
    if (dateFilter === '24h') return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (dateFilter === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  };

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

  // Client-side pagination for filtered results
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
      <div className="py-6 flex items-center gap-2.5">
        <Newspaper className="w-5 h-5 text-accent" />
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('news.title')}
        </h1>
      </div>

      {/* Tab bar + scrape status */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors',
                activeTab === tab.key
                  ? 'bg-accent text-white'
                  : 'bg-bg-secondary text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[12px] text-text-quaternary">
          {currentScrapeStatus && (
            <span>
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
