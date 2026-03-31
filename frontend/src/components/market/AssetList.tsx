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
  /** AI 분석 버튼 렌더 슬롯 (필터 우측 끝에 배치)
   * AI analysis button render slot (placed at right end of filters) */
  aiButton?: React.ReactNode;
}

const PAGE_SIZE = 20;

type SortKey = 'turnover' | 'volume' | 'change_desc' | 'change_asc';

/** 자산 목록 — 카테고리/정렬/기간 필터가 적용된 종목 리스트
 * Asset list — filterable by category, sort, and period */
export default function AssetList({ assets, period, onPeriodChange, mainTab = 'realtime', watchlistSymbols, onToggleWatchlist, aiButton }: AssetListProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<SortKey>('turnover');
  const [page, setPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const categoryTabs = [
    { key: 'all', label: t('filter.all') },
    { key: 'CRYPTO', label: t('filter.crypto') },
    { key: 'STOCK_KR', label: t('filter.stockKR') },
    { key: 'STOCK_US', label: t('filter.stockUS') },
  ];

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'turnover', label: '거래대금' },
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

  // 정렬 순서(심볼 배열)와 최신 데이터 매핑을 분리하여 성능 최적화
  // Separate sort order (symbol array) from data mapping for performance

  // 정렬 키 — 필터/정렬/탭 변경 시에만 재정렬 (가격 업데이트 시에는 안 함)
  // Sort key — only re-sort on filter/sort/tab change (not on price updates)
  const sortKey = `${category}:${sort}:${mainTab}`;
  const sortedOrderRef = useRef<string[]>([]);
  const lastSortKeyRef = useRef('');

  const sortedAssets = useMemo(() => {
    const assetMap = new Map(assets.map((a) => [a.symbol, a]));

    // 필터/정렬 변경 시 또는 최초 로딩 시에만 정렬 수행
    // Only perform sort on filter/sort change or initial load
    if (sortKey !== lastSortKeyRef.current || sortedOrderRef.current.length === 0) {
      let filtered: Asset[];
      if (category === 'all') {
        filtered = [...assets];
      } else if (category === 'STOCK_KR') {
        filtered = assets.filter((a) => a.type === 'STOCK' && a.symbol.endsWith('.KS'));
      } else if (category === 'STOCK_US') {
        filtered = assets.filter((a) => a.type === 'STOCK' && !a.symbol.endsWith('.KS'));
      } else {
        filtered = assets.filter((a) => a.type === category);
      }

      const tiebreak = (a: Asset, b: Asset) => a.symbol.localeCompare(b.symbol);
      const KRW_TO_USD = 1 / 1400;
      const toUsdTurnover = (a: Asset) => {
        const raw = a.currentPrice * (a.volume ?? 0);
        return a.symbol.endsWith('.KS') ? raw * KRW_TO_USD : raw;
      };
      const byTurnover = (a: Asset, b: Asset) => (toUsdTurnover(b) - toUsdTurnover(a)) || tiebreak(a, b);
      const byVolume = (a: Asset, b: Asset) => ((b.volume ?? 0) - (a.volume ?? 0)) || tiebreak(a, b);

      if (mainTab === 'popular') {
        filtered.sort(byTurnover);
      } else if (mainTab === 'trending') {
        filtered.sort((a, b) => (Math.abs(b.changePercent) - Math.abs(a.changePercent)) || tiebreak(a, b));
      } else {
        switch (sort) {
          case 'turnover': filtered.sort(byTurnover); break;
          case 'volume': filtered.sort(byVolume); break;
          case 'change_desc': filtered.sort((a, b) => (b.changePercent - a.changePercent) || tiebreak(a, b)); break;
          case 'change_asc': filtered.sort((a, b) => (a.changePercent - b.changePercent) || tiebreak(a, b)); break;
        }
      }

      sortedOrderRef.current = filtered.map((a) => a.symbol);
      lastSortKeyRef.current = sortKey;
    }

    // 정렬 순서는 유지하되 최신 데이터를 매핑 — 정렬 비용 없이 데이터만 교체
    // Keep sort order but map to latest data — swap data without sort cost
    return sortedOrderRef.current
      .map((sym) => assetMap.get(sym))
      .filter((a): a is Asset => a != null);
  }, [assets, sortKey, category, sort, mainTab]);

  const paged = useMemo(() => sortedAssets.slice(0, page * PAGE_SIZE), [sortedAssets, page]);
  const hasMore = paged.length < sortedAssets.length;

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
      // ETC-L-01: 개별 offsetHeight 대신 requestAnimationFrame으로 배치 FLIP 처리
      // ETC-L-01: Use requestAnimationFrame for batched FLIP instead of individual offsetHeight calls
      const movedEls: { el: HTMLElement; delta: number }[] = [];
      paged.forEach((asset, i) => {
        const prevIndex = prev.get(asset.symbol);
        if (prevIndex !== undefined && prevIndex !== i) {
          const el = rowElsRef.current.get(asset.symbol);
          if (!el) return;
          const delta = (prevIndex - i) * ROW_HEIGHT;
          el.style.transition = 'none';
          el.style.transform = `translateY(${delta}px)`;
          el.style.zIndex = '1';
          movedEls.push({ el, delta });
        }
      });
      if (movedEls.length > 0) {
        requestAnimationFrame(() => {
          movedEls.forEach(({ el }) => {
            el.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            el.style.transform = 'translateY(0)';
            el.style.zIndex = '';
          });
        });
      }
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
        <div className="lg:hidden flex items-center w-full pt-4 pb-3 gap-2">
          <div className="flex items-center gap-1.5 min-w-0 cursor-pointer" onClick={() => setMobileFilterOpen((v) => !v)}>
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
            <ChevronDown className={cn('w-4 h-4 text-text-quaternary transition-transform duration-200 shrink-0 ml-1', mobileFilterOpen && 'rotate-180')} />
          </div>
          {/* AI 분석 버튼 — 모바일 필터 행 우측 / AI button — mobile filter row right */}
          {aiButton && <div className="ml-auto shrink-0">{aiButton}</div>}
        </div>

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
          {/* AI 분석 버튼 — 필터 우측 끝 / AI analysis button — right end of filters */}
          {aiButton && <div className="ml-auto shrink-0">{aiButton}</div>}
        </div>

        {/* 테이블 헤더 (기간에 따라 라벨 변경) / Table header (labels change by period) */}
        <div className="flex items-center pt-3 pb-2.5 text-[10px] sm:text-[11px] md:text-[12px] text-text-quaternary font-medium -mx-3 px-3 border-b border-border/60">
        <span className="w-6 sm:w-8 text-center shrink-0 mr-2 sm:mr-3">{t('table.rank')}</span>
        {/* 별표(관심종목) 아이콘 너비만큼 오프셋 — 종목명이 아이콘이 아닌 이름 위에 정렬되도록 */}
        {/* Offset by watchlist star icon width — aligns header above the name, not the star */}
        <span className="w-[90px] sm:w-[120px] md:w-[130px] lg:w-[160px] shrink-0 truncate ml-7 sm:ml-8">
          {t('table.name')} · <span className="text-text-quaternary/70">{timeStr}</span>
        </span>
        <div className="flex-1 min-w-4" />
        <span className="w-[80px] sm:w-[110px] lg:w-[130px] text-right shrink-0 truncate">{t('table.price')}</span>
        <span className="w-[85px] md:w-[100px] lg:w-[110px] text-right shrink-0 hidden sm:block truncate">
          {changeLabel}
        </span>
        <span className="w-[58px] sm:w-[78px] lg:w-[90px] text-right shrink-0 truncate">{t('table.changeRate')}</span>
        <span className="w-[95px] text-right hidden xl:block shrink-0">
          {period === 'realtime' ? t('table.highRealtime') : t('table.highPeriod')}
        </span>
        <span className="w-[95px] text-right hidden xl:block shrink-0">
          {period === 'realtime' ? t('table.lowRealtime') : t('table.lowPeriod')}
        </span>
        <span className="w-[85px] lg:w-[100px] text-right hidden md:block shrink-0">{t('table.tradingVolume')}</span>
        </div>
      </div>

      {/* 자산 행 목록 / Asset rows */}
      <div>
        {paged.map((asset, index) => (
          <div
            key={asset.symbol}
            ref={(el) => setRowRef(asset.symbol, el)}
            // ANI-M-02: 리스트 항목 스태거 애니메이션 — 순차적 페이드인 효과
            // ANI-M-02: List item stagger animation — sequential fade-in effect
            className="animate-list-stagger"
            style={{ animationDelay: `${Math.min(index * 30, 600)}ms` }}
          >
            <AssetListItem
              asset={asset}
              rank={index + 1}
              isWatchlisted={watchlistSymbols?.includes(asset.symbol)}
              onToggleWatchlist={onToggleWatchlist}
            />
          </div>
        ))}
        {sortedAssets.length === 0 && (
          <div className="py-24 text-center text-text-quaternary text-[14px] whitespace-pre-line">
            {mainTab === 'watchlist' ? (
              <div className="flex flex-col items-center gap-3">
                {/* A11Y-L-01: 장식용 SVG에 aria-hidden 추가 / Add aria-hidden to decorative SVG */}
                <svg className="w-10 h-10 text-text-quaternary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
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
            {t('table.loadMore')} ({paged.length}/{sortedAssets.length})
          </button>
        </div>
      )}
    </div>
  );
}
