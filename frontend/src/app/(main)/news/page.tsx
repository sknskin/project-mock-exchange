'use client';

import { useState } from 'react';
import { RefreshCw, ExternalLink, Newspaper } from 'lucide-react';
import { useNews, useScrapeStatus, useTriggerScrape } from '@/hooks/useNews';
import { useTranslation } from '@/hooks/useTranslation';
import Pagination from '@/components/ui/Pagination';
import { cn } from '@/lib/format';

type NewsTab = 'CRYPTO' | 'DOMESTIC_STOCK' | 'FOREIGN_STOCK';

export default function NewsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<NewsTab>('CRYPTO');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useNews({ category: activeTab, page, limit });
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

  const handleRefresh = () => {
    if (!triggerScrape.isPending) {
      triggerScrape.mutate(activeTab);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', {
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
    return d.toLocaleString('ko-KR', {
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
      <div className="py-6">
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('news.title')}
        </h1>
      </div>

      {/* Tab bar + scrape status */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
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
      ) : !data || data.items.length === 0 ? (
        <div className="py-24 text-center">
          <Newspaper className="w-10 h-10 mx-auto mb-3 text-text-quaternary" />
          <p className="text-text-quaternary text-[14px]">
            {t('news.noItems')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => (
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
      {data && data.totalPages > 0 && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          total={data.total}
          limit={limit}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(n) => { setLimit(n); setPage(1); }}
        />
      )}
    </div>
  );
}
