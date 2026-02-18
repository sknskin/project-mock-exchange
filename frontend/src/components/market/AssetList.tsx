'use client';

import { useState, useMemo } from 'react';
import AssetListItem from './AssetListItem';
import { useTranslation } from '@/hooks/useTranslation';
import type { Asset } from '@/types';
import { cn } from '@/lib/format';

interface AssetListProps {
  assets: Asset[];
}

const PAGE_SIZE = 30;

type SortKey = 'volume' | 'change_desc' | 'change_asc' | 'amount_desc' | 'amount_low';

export default function AssetList({ assets }: AssetListProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<SortKey>('volume');
  const [period, setPeriod] = useState('realtime');
  const [page, setPage] = useState(1);

  const categoryTabs = [
    { key: 'all', label: t('filter.all') },
    { key: 'CRYPTO', label: t('filter.crypto') },
    { key: 'STOCK', label: t('filter.stock') },
  ];

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'volume', label: t('filter.volume') },
    { key: 'change_desc', label: t('filter.riseTop') },
    { key: 'change_asc', label: t('filter.fallTop') },
    { key: 'amount_desc', label: t('filter.amountHigh') },
    { key: 'amount_low', label: t('filter.amountLow') },
  ];

  const periodOptions = [
    { key: 'realtime', label: t('filter.realtime') },
    { key: '1d', label: t('filter.1d') },
    { key: '1w', label: t('filter.1w') },
    { key: '1m', label: t('filter.1m') },
    { key: '3m', label: t('filter.3m') },
    { key: '6m', label: t('filter.6m') },
    { key: '1y', label: t('filter.1y') },
  ];

  const filtered = useMemo(() => {
    let result = category === 'all' ? assets : assets.filter((a) => a.type === category);
    switch (sort) {
      case 'volume': result = [...result].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)); break;
      case 'change_desc': result = [...result].sort((a, b) => b.changePercent - a.changePercent); break;
      case 'change_asc': result = [...result].sort((a, b) => a.changePercent - b.changePercent); break;
      case 'amount_desc': result = [...result].sort((a, b) => (b.currentPrice * (b.volume ?? 0)) - (a.currentPrice * (a.volume ?? 0))); break;
      case 'amount_low': result = [...result].sort((a, b) => (a.currentPrice * (a.volume ?? 0)) - (b.currentPrice * (b.volume ?? 0))); break;
    }
    return result;
  }, [assets, category, sort]);

  const paged = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = paged.length < filtered.length;

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const pillActive = 'bg-accent/15 text-accent font-bold';
  const pillInactive = 'text-text-quaternary hover:text-text-tertiary';

  return (
    <div>
      {/* Filters */}
      <div className="pt-8 pb-4 flex items-center gap-2.5 overflow-x-auto scrollbar-hide">
        {/* Category group */}
        <div className="flex items-center gap-1.5 shrink-0 bg-bg-secondary/50 rounded-xl px-1.5 py-1.5">
          {categoryTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setCategory(tab.key); setPage(1); }}
              className={cn(
                'h-[32px] px-4 text-[13px] font-semibold rounded-lg transition-colors whitespace-nowrap',
                category === tab.key ? pillActive : pillInactive,
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort group */}
        <div className="flex items-center gap-1 shrink-0 bg-bg-secondary/50 rounded-xl px-1.5 py-1.5">
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { setSort(opt.key); setPage(1); }}
              className={cn(
                'h-[32px] px-3.5 text-[13px] font-medium transition-colors whitespace-nowrap rounded-lg',
                sort === opt.key ? pillActive : pillInactive,
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Period group */}
        <div className="flex items-center gap-0.5 shrink-0 bg-bg-secondary/50 rounded-xl px-1.5 py-1.5">
          {periodOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPeriod(opt.key)}
              className={cn(
                'h-[32px] px-2.5 text-[13px] font-medium transition-colors whitespace-nowrap rounded-lg',
                period === opt.key ? pillActive : pillInactive,
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center pt-3 pb-2.5 text-[12px] text-text-quaternary font-medium -mx-3 px-3">
        <span className="w-6 sm:w-8 text-center shrink-0 mr-2 sm:mr-3">{t('table.rank')}</span>
        <span className="w-[120px] sm:w-[180px] lg:w-[200px] shrink-0">
          {t('table.name')} · <span className="text-text-quaternary/70">{timeStr}</span>
        </span>
        <div className="flex-1 min-w-2" />
        <span className="w-[88px] sm:w-[100px] lg:w-[120px] text-right shrink-0">{t('table.price')}</span>
        <span className="w-[90px] lg:w-[100px] text-right shrink-0 hidden sm:block">{t('table.change')}</span>
        <span className="w-[62px] sm:w-[72px] lg:w-[84px] text-right shrink-0">{t('table.changeRate')}</span>
        <span className="w-[90px] text-right hidden xl:block shrink-0">{t('table.high24h')}</span>
        <span className="w-[90px] text-right hidden xl:block shrink-0">{t('table.low24h')}</span>
        <span className="w-[80px] lg:w-[90px] text-right hidden md:block shrink-0">{t('table.tradingVolume')}</span>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/60" />

      {/* Asset rows */}
      <div>
        {paged.map((asset, index) => (
          <AssetListItem key={asset.symbol} asset={asset} rank={index + 1} />
        ))}
        {filtered.length === 0 && (
          <div className="py-24 text-center text-text-quaternary text-[14px]">
            {t('table.empty')}
          </div>
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="py-6 flex justify-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="h-10 px-8 text-[13px] font-semibold text-accent bg-accent/10 rounded-lg hover:bg-accent/20 transition-colors"
          >
            {t('table.loadMore')} ({paged.length}/{filtered.length})
          </button>
        </div>
      )}
    </div>
  );
}
