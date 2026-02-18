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
  { key: 'volume', label: '거래량' },
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
      <div className="px-4 sm:px-6 pt-5 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {categoryTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCategory(tab.key)}
            className={cn(
              'h-9 px-4 text-[14px] font-bold rounded-full transition-colors shrink-0',
              category === tab.key
                ? 'bg-text-primary text-bg-primary'
                : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            {tab.label}
          </button>
        ))}

        <div className="w-px h-5 bg-text-quaternary/30 mx-1 shrink-0" />

        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key as SortKey)}
            className={cn(
              'h-9 px-4 text-[14px] font-semibold rounded-full transition-colors shrink-0',
              sort === opt.key
                ? 'bg-bg-tertiary text-text-primary'
                : 'text-text-quaternary hover:text-text-tertiary',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filter row 2: Period */}
      <div className="px-4 sm:px-6 pb-4 flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {periodOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setPeriod(opt.key)}
            className={cn(
              'h-8 px-3.5 text-[13px] font-semibold rounded-full transition-colors shrink-0',
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
      <div className="flex items-center px-4 sm:px-6 py-2 text-[11px] sm:text-[12px] text-text-quaternary font-medium border-b border-border">
        <span className="w-6 sm:w-7 ml-[26px] sm:ml-[30px] text-center shrink-0">순위</span>
        <span className="flex-1 pl-2 sm:pl-3 truncate">
          종목명 · 오늘 {timeStr} 기준
        </span>
        <span className="w-auto sm:w-[120px] text-right shrink-0 pl-2">현재가</span>
        <span className="w-[72px] sm:w-[100px] text-right shrink-0">등락률</span>
        <span className="w-[100px] text-right hidden md:block shrink-0">거래대금 순</span>
      </div>

      {/* Asset rows */}
      <div>
        {filtered.map((asset, index) => (
          <AssetListItem key={asset.symbol} asset={asset} rank={index + 1} />
        ))}
        {filtered.length === 0 && (
          <div className="py-20 text-center text-text-tertiary text-[14px]">
            종목이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
