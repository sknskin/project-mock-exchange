'use client';

import { useState, useMemo } from 'react';
import AssetListItem from './AssetListItem';
import type { Asset } from '@/types';
import { cn } from '@/lib/format';

interface AssetListProps {
  assets: Asset[];
}

const categoryTabs = [
  { key: 'all', label: '전체' },
  { key: 'CRYPTO', label: '암호화폐' },
  { key: 'STOCK', label: '주식' },
];

const sortOptions = [
  { key: 'volume', label: '거래량순' },
  { key: 'change_desc', label: '급상승' },
  { key: 'change_asc', label: '급하락' },
];

const periodOptions = [
  { key: 'realtime', label: '실시간' },
  { key: '1d', label: '1일' },
  { key: '1w', label: '1주일' },
  { key: '1m', label: '1개월' },
  { key: '3m', label: '3개월' },
  { key: '6m', label: '6개월' },
  { key: '1y', label: '1년' },
];

type SortKey = 'volume' | 'change_desc' | 'change_asc';

export default function AssetList({ assets }: AssetListProps) {
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<SortKey>('volume');
  const [period, setPeriod] = useState('realtime');

  const filtered = useMemo(() => {
    let result = category === 'all' ? assets : assets.filter((a) => a.type === category);

    switch (sort) {
      case 'volume':
        result = [...result].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
        break;
      case 'change_desc':
        result = [...result].sort((a, b) => b.changePercent - a.changePercent);
        break;
      case 'change_asc':
        result = [...result].sort((a, b) => a.changePercent - b.changePercent);
        break;
    }

    return result;
  }, [assets, category, sort]);

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div>
      {/* Filter row 1: Category + Sort */}
      <div className="px-4 sm:px-6 pt-5 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {categoryTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCategory(tab.key)}
            className={cn(
              'h-[34px] px-4 text-[13px] font-bold rounded-full transition-all shrink-0',
              category === tab.key
                ? 'bg-text-primary text-bg-primary shadow-sm'
                : 'bg-bg-secondary text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary',
            )}
          >
            {tab.label}
          </button>
        ))}

        <div className="w-px h-4 bg-text-quaternary/20 mx-2 shrink-0" />

        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key as SortKey)}
            className={cn(
              'h-[34px] px-4 text-[13px] font-semibold rounded-full transition-all shrink-0',
              sort === opt.key
                ? 'bg-bg-tertiary text-text-primary'
                : 'text-text-quaternary hover:text-text-tertiary hover:bg-bg-secondary',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filter row 2: Period */}
      <div className="px-4 sm:px-6 pb-4 pt-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {periodOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setPeriod(opt.key)}
            className={cn(
              'h-[30px] px-3 text-[12px] font-semibold rounded-full transition-all shrink-0',
              period === opt.key
                ? 'bg-bg-tertiary text-text-primary'
                : 'text-text-quaternary hover:text-text-tertiary',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="flex items-center px-4 sm:px-6 py-2.5 text-[11px] text-text-quaternary font-medium border-b border-border/80">
        <span className="w-7 ml-6 text-center shrink-0">순위</span>
        <span className="flex-1 pl-2.5">
          종목명 · {timeStr} 기준
        </span>
        <span className="min-w-[100px] sm:min-w-[130px] text-right shrink-0 pl-3">현재가</span>
        <span className="w-[76px] sm:w-[88px] text-right shrink-0 pl-2">등락률</span>
        <span className="w-[88px] text-right hidden md:block shrink-0 pl-2">거래대금</span>
      </div>

      {/* Asset rows */}
      <div className="divide-y divide-border/40">
        {filtered.map((asset, index) => (
          <AssetListItem key={asset.symbol} asset={asset} rank={index + 1} />
        ))}
        {filtered.length === 0 && (
          <div className="py-24 text-center text-text-quaternary text-[14px]">
            종목이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
