/**
 * @file 체결 내역 컴포넌트
 * @description 사용자의 체결 내역을 필터(매수/매도, 심볼) + CSV 내보내기와 함께 표시
 *
 * @file Trade History Component
 * @description Displays user trade history with filters (buy/sell, symbol) + CSV export
 */
'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Skeleton from '@/components/ui/Skeleton';
import ServiceError from '@/components/ui/ServiceError';
import { cn, formatPriceDisplay } from '@/lib/format';
import { Search, BarChart, LayoutDashboard, Download, X } from 'lucide-react';
import { exportToCSV } from '@/lib/export';
import type { TranslationKey } from '@/lib/i18n';
import type { TradeHistory as TradeHistoryType } from '@/hooks/useOrders';

// LV-M-01: 한 번에 렌더링할 최대 항목 수 — 리스트 가상화 대신 페이지네이션으로 성능 개선
// LV-M-01: Max items to render at once — pagination instead of virtualization for performance
const PAGE_SIZE = 20;

interface TradeHistoryProps {
  trades: TradeHistoryType[] | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  userId: string | undefined;
  currencyMode: 'krw' | 'original';
  rate?: number;
  t: (key: TranslationKey) => string;
}

/**
 * 체결 내역 탭 — 필터 + CSV 내보내기 + 거래 리스트
 * Trade history tab — filters + CSV export + trade list
 */
export default function TradeHistory({
  trades,
  isLoading,
  error,
  refetch,
  userId,
  currencyMode,
  rate,
  t,
}: TradeHistoryProps) {
  // 체결내역 탭 필터 상태 / Trade history tab filter state
  const [tradeSideFilter, setTradeSideFilter] = useState<'all' | 'BUY' | 'SELL'>('all');
  const [tradeSearch, setTradeSearch] = useState('');
  // LV-M-01: 표시할 항목 수 (페이지네이션 상태) / Displayed item count (pagination state)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /**
   * 체결내역 클라이언트 측 필터 (매수/매도 + 심볼 검색)
   * buyerId === 현재 유저 ID이면 매수, 아니면 매도로 판정
   *
   * Trade history client-side filter (side + symbol)
   * buyerId === current user ID means BUY side, otherwise SELL
   */
  const filteredTrades = useMemo(() => {
    if (!trades) return [];
    return trades.filter((trade) => {
      if (tradeSideFilter !== 'all') {
        const isBuyer = trade.buyerId === userId;
        if (tradeSideFilter === 'BUY' && !isBuyer) return false;
        if (tradeSideFilter === 'SELL' && isBuyer) return false;
      }
      if (tradeSearch.trim()) {
        const q = tradeSearch.toLowerCase();
        if (!trade.symbol.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [trades, tradeSideFilter, tradeSearch, userId]);

  // LV-M-01: 필터 변경 시 표시 항목 수 초기화 / Reset visible count on filter change
  const resetAndFilter = useCallback(() => setVisibleCount(PAGE_SIZE), []);
  // 필터 변경 감지 — side 필터나 검색어 변경 시 표시 수 리셋
  // Detect filter changes — reset visible count when side filter or search changes
  useMemo(() => { resetAndFilter(); }, [tradeSideFilter, tradeSearch, resetAndFilter]);

  // LV-M-01: 현재까지 표시할 항목만 슬라이스 / Slice items up to current visible count
  const displayedTrades = useMemo(() => filteredTrades.slice(0, visibleCount), [filteredTrades, visibleCount]);
  const hasMore = visibleCount < filteredTrades.length;

  // 더 보기 핸들러 / Load more handler
  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  return (
    <div>
      {/* 체결내역 필터 바 — 심볼 검색 + 매수/매도 세그먼트 / Trade history filter bar — symbol search + buy/sell segment */}
      <div className="flex gap-2 sm:gap-3 mb-5">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary pointer-events-none" />
          <input
            type="text"
            value={tradeSearch}
            onChange={(e) => setTradeSearch(e.target.value)}
            placeholder={t('orders.searchSymbol')}
            className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-9 py-2.5 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
          />
          {tradeSearch && (
            <button onClick={() => setTradeSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-text-quaternary hover:text-text-primary transition-colors" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex shrink-0 bg-bg-secondary border border-border rounded-xl overflow-hidden">
          {(['all', 'BUY', 'SELL'] as const).map((side) => (
            <button
              key={side}
              onClick={() => setTradeSideFilter(side)}
              className={cn(
                'px-3 py-2.5 text-[13px] font-medium transition-colors',
                tradeSideFilter === side
                  ? side === 'BUY' ? 'bg-rise/15 text-rise' : side === 'SELL' ? 'bg-fall/15 text-fall' : 'bg-accent/15 text-accent'
                  : 'text-text-tertiary hover:text-text-primary',
              )}
            >
              {side === 'all' ? t('orders.all') : side === 'BUY' ? t('orders.buy') : t('orders.sell')}
            </button>
          ))}
        </div>
      </div>

      {/* CSV 내보내기 버튼 / CSV export button */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => {
            if (!filteredTrades.length) return;
            exportToCSV(
              filteredTrades.map((trade) => ({
                symbol: trade.symbol,
                side: trade.buyerId === userId ? 'BUY' : 'SELL',
                price: trade.price,
                quantity: trade.quantity,
                total: trade.total,
                executedAt: new Date(trade.executedAt).toLocaleString(),
              })),
              `trades-${new Date().toISOString().slice(0, 10)}`,
              [
                { key: 'symbol', label: t('orders.analysisSymbol') },
                { key: 'side', label: t('orders.side') },
                { key: 'price', label: t('orders.price') },
                { key: 'quantity', label: t('orders.quantity') },
                { key: 'total', label: t('orders.totalAmount') },
                { key: 'executedAt', label: t('orders.executedAt') },
              ],
            );
          }}
          disabled={!filteredTrades.length}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-text-tertiary hover:text-text-primary border border-border rounded-lg hover:bg-bg-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Download className="w-3.5 h-3.5" />
          {t('export.csv')}
        </button>
      </div>

      {error ? (
        <ServiceError onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-2 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-16 rounded-xl" />
          ))}
        </div>
      ) : displayedTrades.length > 0 ? (
        <div className="divide-y divide-border/40">
          {displayedTrades.map((trade) => {
            const isBuyer = trade.buyerId === userId;
            return (
              <div key={trade.tradeId} className="py-3 flex items-center gap-2 md:gap-3">
                <div className={cn(
                  'w-9 md:w-10 h-6 rounded text-[10px] md:text-[11px] font-bold flex items-center justify-center shrink-0',
                  isBuyer ? 'bg-rise/12 text-rise' : 'bg-fall/12 text-fall',
                )}>
                  {isBuyer ? t('orders.buy') : t('orders.sell')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] md:text-[14px] font-semibold text-text-primary truncate">{trade.symbol}</div>
                  <div className="text-[11px] md:text-[12px] text-text-quaternary truncate">
                    {new Date(trade.executedAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right shrink-0 min-w-0 max-w-[45%]">
                  <div className="text-[12px] md:text-[13px] font-medium text-text-primary tabular-nums truncate">
                    {formatPriceDisplay(trade.price, trade.symbol, currencyMode, rate)} × {trade.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                  </div>
                  <div className="text-[11px] md:text-[12px] text-text-tertiary tabular-nums truncate">
                    {t('orders.totalAmount')}: {formatPriceDisplay(trade.total, trade.symbol, currencyMode, rate)}
                  </div>
                </div>
              </div>
            );
          })}
          {/* LV-M-01: 더 보기 버튼 — 항목이 남아 있을 때 표시
              LV-M-01: Load more button — shown when more items remain */}
          {hasMore && (
            <div className="flex justify-center pt-4 pb-2">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2.5 text-[13px] font-semibold text-accent border border-accent/30 rounded-xl hover:bg-accent/10 transition-colors"
              >
                {t('table.loadMore')} ({filteredTrades.length - visibleCount})
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-24 flex flex-col items-center text-center">
          <BarChart className="w-10 h-10 text-text-quaternary/40 mb-3" />
          <p className="text-text-quaternary text-[14px] whitespace-pre-line">
            {t('orders.emptyTrades')}
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-accent bg-accent/10 rounded-lg hover:bg-accent/20 transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            {t('orders.goToDashboard')}
          </Link>
        </div>
      )}
    </div>
  );
}
