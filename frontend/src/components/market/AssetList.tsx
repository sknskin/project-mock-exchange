/**
 * @file 자산 목록 컴포넌트
 * @description 필터, 정렬 기능이 있는 전체 종목 리스트
 *
 * @file Asset List Component
 * @description Full asset list with filter and sort functionality
 */
'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import AssetListItem from './AssetListItem';
import { useTranslation } from '@/hooks/useTranslation';
import type { Asset } from '@/types';
import { cn } from '@/lib/format';

const ROW_HEIGHT = 56;

// 자산 목록 Props / Asset List Props
interface AssetListProps {
  /** 전체 자산 데이터 배열
   * Full asset data array */
  assets: Asset[];
  /** 현재 선택된 기간 (realtime, 1d, 1w 등)
   * Currently selected period (realtime, 1d, 1w, etc.) */
  period: string;
  /** 기간 변경 콜백
   * Period change callback */
  onPeriodChange: (period: string) => void;
  /** 메인 탭 (realtime, popular, trending, watchlist)
   * Main tab (realtime, popular, trending, watchlist) */
  mainTab?: string;
  /** 로그인 필요 시 콜백
   * Callback when login is required */
  onLoginRequired?: () => void;
  /** 관심종목 심볼 목록
   * Watchlist symbol list */
  watchlistSymbols?: string[];
  /** 관심종목 토글 콜백
   * Watchlist toggle callback */
  onToggleWatchlist?: (symbol: string) => void;
}

const PAGE_SIZE = 50;

type SortKey = 'volume' | 'change_desc' | 'change_asc';

/** 자산 목록 — 카테고리/정렬/기간 필터가 적용된 종목 리스트
 * Asset list — filterable by category, sort, and period */
export default function AssetList({ assets, period, onPeriodChange, mainTab = 'realtime', onLoginRequired: _onLoginRequired, watchlistSymbols, onToggleWatchlist }: AssetListProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<SortKey>('volume');
  const [page, setPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const categoryTabs = [
    { key: 'all', label: t('filter.all') },
    { key: 'CRYPTO', label: t('filter.crypto') },
    { key: 'STOCK_KR', label: t('filter.stockKR') },
    { key: 'STOCK_US', label: t('filter.stockUS') },
  ];

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'volume', label: t('filter.volume') },
    { key: 'change_desc', label: t('filter.riseTop') },
    { key: 'change_asc', label: t('filter.fallTop') },
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

  // 쓰로틀 정렬: 실시간 틱 시 최대 3초마다 재정렬, 필터 변경 시 즉시 정렬
  // FLIP 애니메이션으로 순위 전환을 부드럽게 처리
  // Throttled sort: re-sort at most every 3s on live ticks, immediate on filter change.
  // FLIP animation handles smooth rank transitions.
  const sortedOrderRef = useRef<string[]>([]);
  const lastSortKeyRef = useRef({ category: 'all', sort: 'volume' as SortKey, period: 'realtime', mainTab: 'realtime' });
  const lastSortTimeRef = useRef(0);
  const SORT_THROTTLE_MS = 3000;

  const filtered = useMemo(() => {
    const assetMap = new Map(assets.map((a) => [a.symbol, a]));
    const now = Date.now();

    const filterChanged =
      lastSortKeyRef.current.category !== category ||
      lastSortKeyRef.current.sort !== sort ||
      lastSortKeyRef.current.period !== period ||
      lastSortKeyRef.current.mainTab !== mainTab;

    const needsResort =
      sortedOrderRef.current.length === 0 ||
      filterChanged ||
      now - lastSortTimeRef.current >= SORT_THROTTLE_MS;

    if (needsResort) {
      let result: Asset[];
      if (category === 'all') {
        result = [...assets];
      } else if (category === 'STOCK_KR') {
        result = assets.filter((a) => a.type === 'STOCK' && a.symbol.endsWith('.KS'));
      } else if (category === 'STOCK_US') {
        result = assets.filter((a) => a.type === 'STOCK' && !a.symbol.endsWith('.KS'));
      } else {
        result = assets.filter((a) => a.type === category);
      }

      const tiebreak = (a: Asset, b: Asset) => a.symbol.localeCompare(b.symbol);

      // 탭별 고유 정렬 적용 / Tab-specific sorting
      // 거래대금 = price × volume (한국 거래소 관행에 맞게 거래량순을 거래대금 기준으로 통합)
      // Turnover = price × volume (unified as per Korean exchange convention)
      const byTurnover = (a: Asset, b: Asset) =>
        ((b.currentPrice * (b.volume ?? 0)) - (a.currentPrice * (a.volume ?? 0))) || tiebreak(a, b);

      if (mainTab === 'popular') {
        // 인기 종목: 거래대금순 고정
        result.sort(byTurnover);
      } else if (mainTab === 'trending') {
        // 투자자 동향: 절대 등락률순 (큰 변동 우선)
        result.sort((a, b) => (Math.abs(b.changePercent) - Math.abs(a.changePercent)) || tiebreak(a, b));
      } else {
        // 실시간 차트: 사용자 선택 정렬
        switch (sort) {
          case 'volume': result.sort(byTurnover); break;
          case 'change_desc': result.sort((a, b) => (b.changePercent - a.changePercent) || tiebreak(a, b)); break;
          case 'change_asc': result.sort((a, b) => (a.changePercent - b.changePercent) || tiebreak(a, b)); break;
        }
      }

      sortedOrderRef.current = result.map((a) => a.symbol);
      lastSortKeyRef.current = { category, sort, period, mainTab };
      lastSortTimeRef.current = now;
    }

    return sortedOrderRef.current
      .map((sym) => assetMap.get(sym))
      .filter((a): a is Asset => a != null);
  }, [assets, category, sort, period, mainTab]);

  const paged = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = paged.length < filtered.length;

  // 순위 변동 FLIP 애니메이션 / FLIP animation for rank changes
  const prevOrderRef = useRef<Map<string, number>>(new Map());
  const rowElsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const setRowRef = useCallback((symbol: string, el: HTMLDivElement | null) => {
    if (el) {
      rowElsRef.current.set(symbol, el);
    } else {
      // 엘리먼트 언마운트 시 stale ref 제거 / Remove stale ref on element unmount
      rowElsRef.current.delete(symbol);
    }
  }, []);

  useEffect(() => {
    const prev = prevOrderRef.current;
    if (prev.size > 0) {
      paged.forEach((asset, i) => {
        const prevIndex = prev.get(asset.symbol);
        if (prevIndex !== undefined && prevIndex !== i) {
          const el = rowElsRef.current.get(asset.symbol);
          if (!el) return;
          const delta = (prevIndex - i) * ROW_HEIGHT;
          el.style.transition = 'none';
          el.style.transform = `translateY(${delta}px)`;
          el.style.zIndex = '1';
          // 리플로우 강제 / force reflow
          void el.offsetHeight;
          el.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          el.style.transform = 'translateY(0)';
          el.style.zIndex = '';
        }
      });
    }
    const next = new Map<string, number>();
    paged.forEach((asset, i) => next.set(asset.symbol, i));
    prevOrderRef.current = next;
  }, [paged]);

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // 기간에 따른 변동 라벨 매핑 / Period-dependent change label mapping
  const changeLabel = useMemo(() => {
    const map: Record<string, string> = {
      realtime: t('table.changeRealtime'),
      '1d': t('table.change1d'),
      '1w': t('table.change1w'),
      '1m': t('table.change1m'),
      '3m': t('table.change3m'),
      '6m': t('table.change6m'),
      '1y': t('table.change1y'),
    };
    return map[period] ?? t('table.change');
  }, [period, t]);

  const handleCategoryChange = useCallback((key: string) => {
    setCategory(key);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((key: SortKey) => {
    setSort(key);
    setPage(1);
  }, []);

  const pillActive = 'bg-accent/15 text-accent font-bold';
  const pillInactive = 'text-text-quaternary hover:text-text-tertiary';

  return (
    <div>
      {/* 필터 + 테이블 헤더 sticky 영역 / Sticky filter + table header area */}
      <div className="sticky top-[60px] z-30 bg-bg-primary">
        {/* 필터 — 데스크톱: 인라인, 모바일: 드롭다운 / Filters — desktop: inline, mobile: dropdown */}

        {/* 모바일 드롭다운 토글 / Mobile dropdown toggle */}
        <button
          onClick={() => setMobileFilterOpen((v) => !v)}
          className="lg:hidden flex items-center justify-between w-full pt-4 pb-3 group"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="bg-accent/10 text-accent text-[12px] font-bold rounded-md px-2 py-0.5 shrink-0">
              {categoryTabs.find((c) => c.key === category)?.label}
            </span>
            {mainTab === 'realtime' && (
              <span className="bg-accent/10 text-accent text-[12px] font-bold rounded-md px-2 py-0.5 shrink-0">
                {sortOptions.find((s) => s.key === sort)?.label}
              </span>
            )}
            {mainTab !== 'popular' && (
              <span className="bg-accent/10 text-accent text-[12px] font-bold rounded-md px-2 py-0.5 shrink-0">
                {periodOptions.find((p) => p.key === period)?.label}
              </span>
            )}
          </div>
          <ChevronDown className={cn('w-4 h-4 text-text-quaternary transition-transform duration-200 shrink-0 ml-2', mobileFilterOpen && 'rotate-180')} />
        </button>

        {/* 모바일 드롭다운 패널 — 부드러운 펼침/접힘 애니메이션 / Mobile dropdown panel — smooth expand/collapse animation */}
        <div className={cn(
          'lg:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out',
          mobileFilterOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0',
        )}>
          <div className="flex flex-col gap-2 pb-3">
            {/* 카테고리 / Category */}
            <div className="flex items-center gap-1.5 bg-bg-secondary/50 rounded-xl px-1.5 py-1.5 overflow-x-auto scrollbar-hide">
              {categoryTabs.map((tab) => (
                <button key={tab.key} onClick={() => handleCategoryChange(tab.key)}
                  className={cn('h-[32px] px-3.5 text-[13px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0', category === tab.key ? pillActive : pillInactive)}>
                  {tab.label}
                </button>
              ))}
            </div>
            {/* 정렬 / Sort */}
            {mainTab === 'realtime' && (
              <div className="flex items-center gap-1 bg-bg-secondary/50 rounded-xl px-1.5 py-1.5 overflow-x-auto scrollbar-hide">
                {sortOptions.map((opt) => (
                  <button key={opt.key} onClick={() => handleSortChange(opt.key)}
                    className={cn('h-[32px] px-3 text-[13px] font-medium transition-colors whitespace-nowrap rounded-lg shrink-0', sort === opt.key ? pillActive : pillInactive)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {/* 기간 / Period */}
            {mainTab !== 'popular' && (
              <div className="flex items-center gap-0.5 bg-bg-secondary/50 rounded-xl px-1.5 py-1.5 overflow-x-auto scrollbar-hide">
                {periodOptions.map((opt) => (
                  <button key={opt.key} onClick={() => onPeriodChange(opt.key)}
                    className={cn('h-[32px] px-2.5 text-[13px] font-medium transition-colors whitespace-nowrap rounded-lg shrink-0', period === opt.key ? pillActive : pillInactive)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 데스크톱 인라인 필터 / Desktop inline filters */}
        <div className="hidden lg:flex pt-4 pb-3 items-center gap-2">
          <div className="flex items-center gap-1.5 bg-bg-secondary/50 rounded-xl px-1.5 py-1.5 shrink-0">
            {categoryTabs.map((tab) => (
              <button key={tab.key} onClick={() => handleCategoryChange(tab.key)}
                className={cn('h-[32px] px-4 text-[13px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0', category === tab.key ? pillActive : pillInactive)}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {mainTab === 'realtime' && (
              <div className="flex items-center gap-1 bg-bg-secondary/50 rounded-xl px-1.5 py-1.5 shrink-0">
                {sortOptions.map((opt) => (
                  <button key={opt.key} onClick={() => handleSortChange(opt.key)}
                    className={cn('h-[32px] px-3.5 text-[13px] font-medium transition-colors whitespace-nowrap rounded-lg shrink-0', sort === opt.key ? pillActive : pillInactive)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {mainTab !== 'popular' && (
              <div className="flex items-center gap-0.5 bg-bg-secondary/50 rounded-xl px-1.5 py-1.5 shrink-0">
                {periodOptions.map((opt) => (
                  <button key={opt.key} onClick={() => onPeriodChange(opt.key)}
                    className={cn('h-[32px] px-2.5 text-[13px] font-medium transition-colors whitespace-nowrap rounded-lg shrink-0', period === opt.key ? pillActive : pillInactive)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 테이블 헤더 (기간에 따라 라벨 변경) / Table header (labels change by period) */}
        <div className="flex items-center pt-3 pb-2.5 text-[11px] md:text-[12px] text-text-quaternary font-medium -mx-3 px-3 border-b border-border/60">
        <span className="w-6 sm:w-8 text-center shrink-0 mr-2 sm:mr-3">{t('table.rank')}</span>
        <span className="w-[120px] sm:w-[160px] md:w-[180px] lg:w-[200px] shrink-0 truncate">
          {t('table.name')} · <span className="text-text-quaternary/70">{timeStr}</span>
        </span>
        <div className="flex-1 min-w-2" />
        <span className="w-[80px] sm:w-[100px] lg:w-[120px] text-right shrink-0">{t('table.price')}</span>
        <span className="w-[80px] md:w-[90px] lg:w-[100px] text-right shrink-0 hidden sm:block truncate">
          {changeLabel}
        </span>
        <span className="w-[60px] sm:w-[72px] lg:w-[84px] text-right shrink-0">{t('table.changeRate')}</span>
        <span className="w-[90px] text-right hidden xl:block shrink-0">
          {period === 'realtime' ? t('table.highRealtime') : t('table.highPeriod')}
        </span>
        <span className="w-[90px] text-right hidden xl:block shrink-0">
          {period === 'realtime' ? t('table.lowRealtime') : t('table.lowPeriod')}
        </span>
        <span className="w-[80px] lg:w-[90px] text-right hidden md:block shrink-0">{t('table.tradingVolume')}</span>
        </div>
      </div>

      {/* 자산 행 목록 / Asset rows */}
      <div>
        {paged.map((asset, index) => (
          <div key={asset.symbol} ref={(el) => setRowRef(asset.symbol, el)}>
            <AssetListItem
              asset={asset}
              rank={index + 1}
              isWatchlisted={watchlistSymbols?.includes(asset.symbol)}
              onToggleWatchlist={onToggleWatchlist}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-24 text-center text-text-quaternary text-[14px] whitespace-pre-line">
            {mainTab === 'watchlist' ? (
              <div className="flex flex-col items-center gap-3">
                <svg className="w-10 h-10 text-text-quaternary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                <span>{t('watchlist.empty')}</span>
              </div>
            ) : t('table.empty')}
          </div>
        )}
      </div>

      {/* 더 보기 / Load More */}
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
