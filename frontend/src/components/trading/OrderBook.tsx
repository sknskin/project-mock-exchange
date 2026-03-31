/**
 * @file 호가창 컴포넌트
 * @description 매수/매도 주문 호가와 수량을 깊이 바, 누적 퍼센트, 스프레드, 중앙가와 함께 시각적으로 표시합니다.
 *              리스트 뷰와 깊이 차트(SVG) 간 토글을 지원합니다.
 *
 * @file Order Book Component
 * @description Visually displays bid/ask order prices and quantities with depth bars,
 *              cumulative percentage, spread, and mid-price.
 *              Supports toggling between list view and depth chart (SVG).
 */
'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn, formatPriceDisplay, formatQuantity } from '@/lib/format';
import { useTranslation } from '@/hooks/useTranslation';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import type { OrderBook as OrderBookType, OrderBookEntry } from '@/types';

interface OrderBookProps {
  orderBook: OrderBookType;
  symbol?: string;
}

/** 누적 합계를 추가한 엔트리
 * Entry with cumulative total */
interface CumulativeEntry extends OrderBookEntry {
  cumTotal: number;
  depthPercent: number;
}

const VISIBLE_LEVELS = 8;

/**
 * 호가 목록에 누적 합계와 깊이 퍼센트를 계산합니다
 * Computes cumulative totals and depth percentages for order book entries
 */
function computeCumulative(entries: OrderBookEntry[]): CumulativeEntry[] {
  let cumTotal = 0;
  return entries.map((entry) => {
    cumTotal += entry.total;
    return { ...entry, cumTotal, depthPercent: 0 };
  });
}

/** 누적 합계 기준 깊이 퍼센트 할당
 * Assign depth percent based on cumulative total */
function assignDepthPercent(entries: CumulativeEntry[]): CumulativeEntry[] {
  if (entries.length === 0) return entries;
  const maxCum = entries[entries.length - 1].cumTotal;
  if (maxCum === 0) return entries;
  return entries.map((e) => ({
    ...e,
    depthPercent: (e.cumTotal / maxCum) * 100,
  }));
}

// ─── 깊이 차트 SVG / Depth Chart SVG ────────────────────────────────

interface DepthChartProps {
  asks: CumulativeEntry[];
  bids: CumulativeEntry[];
  fp: (price: number) => string;
}

/** 깊이 차트 — 매수/매도 누적 수량을 SVG로 시각화
 * Depth chart — visualizes bid/ask cumulative volume as SVG */
function DepthChart({ asks, bids, fp }: DepthChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    if (bids.length === 0 && asks.length === 0) return null;

    // 매수: 가격 내림차순 → cumTotal 누적 (왼쪽)
    // Bids: descending price → cumulative (left side)
    const bidsSorted = [...bids].sort((a, b) => b.price - a.price);
    // 매도: 가격 오름차순 → cumTotal 누적 (오른쪽)
    // Asks: ascending price → cumulative (right side)
    const asksSorted = [...asks].sort((a, b) => a.price - b.price);

    const allPrices = [...bidsSorted, ...asksSorted].map((e) => e.price);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice || 1;

    const maxCumBid = bidsSorted.length > 0 ? bidsSorted[bidsSorted.length - 1].cumTotal : 0;
    const maxCumAsk = asksSorted.length > 0 ? asksSorted[asksSorted.length - 1].cumTotal : 0;
    const maxCum = Math.max(maxCumBid, maxCumAsk) || 1;

    return { bidsSorted, asksSorted, minPrice, maxPrice, priceRange, maxCum };
  }, [asks, bids]);

  if (!chartData) {
    return (
      <div className="h-[200px] flex items-center justify-center text-text-quaternary text-[13px]">
        {t('common.noData')}
      </div>
    );
  }

  const { bidsSorted, asksSorted, minPrice, priceRange, maxCum } = chartData;
  const W = 100;
  const H = 100;
  const PAD_X = 0;
  const PAD_Y = 4;

  const toX = (price: number) => PAD_X + ((price - minPrice) / priceRange) * (W - 2 * PAD_X);
  const toY = (cum: number) => H - PAD_Y - (cum / maxCum) * (H - 2 * PAD_Y);

  // 매수 경로: 왼쪽 → 오른쪽 (가격 오름차순, cumTotal 내림차순)
  // Bid path: left → right (ascending price, descending cumTotal)
  const bidPoints = [...bidsSorted].reverse();
  const bidPath =
    bidPoints.length > 0
      ? `M ${toX(bidPoints[0].price)} ${toY(bidPoints[0].cumTotal)} ` +
        bidPoints
          .slice(1)
          .map((p) => {
            const x = toX(p.price);
            const y = toY(p.cumTotal);
            return `L ${x} ${y}`;
          })
          .join(' ') +
        ` L ${toX(bidPoints[bidPoints.length - 1].price)} ${H - PAD_Y} L ${toX(bidPoints[0].price)} ${H - PAD_Y} Z`
      : '';

  // 매도 경로 / Ask path
  const askPath =
    asksSorted.length > 0
      ? `M ${toX(asksSorted[0].price)} ${toY(asksSorted[0].cumTotal)} ` +
        asksSorted
          .slice(1)
          .map((p) => {
            const x = toX(p.price);
            const y = toY(p.cumTotal);
            return `L ${x} ${y}`;
          })
          .join(' ') +
        ` L ${toX(asksSorted[asksSorted.length - 1].price)} ${H - PAD_Y} L ${toX(asksSorted[0].price)} ${H - PAD_Y} Z`
      : '';

  // 매수 선 / Bid line (without fill area closure)
  const bidLine =
    bidPoints.length > 0
      ? `M ${toX(bidPoints[0].price)} ${toY(bidPoints[0].cumTotal)} ` +
        bidPoints
          .slice(1)
          .map((p) => `L ${toX(p.price)} ${toY(p.cumTotal)}`)
          .join(' ')
      : '';

  // 매도 선 / Ask line
  const askLine =
    asksSorted.length > 0
      ? `M ${toX(asksSorted[0].price)} ${toY(asksSorted[0].cumTotal)} ` +
        asksSorted
          .slice(1)
          .map((p) => `L ${toX(p.price)} ${toY(p.cumTotal)}`)
          .join(' ')
      : '';

  // 중앙 가격 / Mid price line
  const midPrice =
    bidsSorted.length > 0 && asksSorted.length > 0
      ? (bidsSorted[0].price + asksSorted[0].price) / 2
      : 0;
  const midX = midPrice ? toX(midPrice) : W / 2;

  return (
    <div className="relative">
      {/* 범례 / Legend */}
      <div className="flex items-center justify-center gap-4 mb-2 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rise/60" />
          <span className="text-text-tertiary">{t('orderbook.bids')}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-fall/60" />
          <span className="text-text-tertiary">{t('orderbook.asks')}</span>
        </span>
      </div>

      {/* A11Y-L-05: 깊이 차트 SVG에 role="img" + aria-label — 스크린 리더 접근성 / Depth chart SVG role="img" + aria-label for screen reader */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-[180px] sm:h-[200px] md:h-[220px]"
        role="img"
        aria-label={t('orderbook.depthChart')}
      >
        {/* 매수 영역 / Bid fill */}
        {bidPath && (
          <path d={bidPath} fill="rgba(240, 68, 82, 0.12)" />
        )}
        {/* 매도 영역 / Ask fill */}
        {askPath && (
          <path d={askPath} fill="rgba(49, 130, 246, 0.12)" />
        )}

        {/* 매수 선 / Bid line */}
        {bidLine && (
          <path
            d={bidLine}
            fill="none"
            stroke="rgba(240, 68, 82, 0.7)"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {/* 매도 선 / Ask line */}
        {askLine && (
          <path
            d={askLine}
            fill="none"
            stroke="rgba(49, 130, 246, 0.7)"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* 중앙가 점선 / Mid price dashed line */}
        {midPrice > 0 && (
          <line
            x1={midX}
            y1={PAD_Y}
            x2={midX}
            y2={H - PAD_Y}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.3"
            strokeDasharray="1.5 1"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* 중앙가 라벨 / Mid price label */}
      {midPrice > 0 && (
        <div className="text-center mt-1">
          <span className="text-[11px] text-text-quaternary">
            {t('orderbook.midPrice')}{' '}
            <span className="text-text-secondary font-semibold tabular-nums">
              {fp(midPrice)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

// ─── 메인 호가창 / Main Order Book ─────────────────────────────────

/** 호가창 — 매수/매도 호가 리스트 및 깊이 차트 표시
 * Order book — displays bid/ask list and depth chart */
export default function OrderBook({ orderBook, symbol = '' }: OrderBookProps) {
  const { t } = useTranslation();
  const { query: { data: rateData } } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const rate = rateData?.rate;
  const fp = (price: number) => formatPriceDisplay(price, symbol, currencyMode, rate);
  const [viewMode, setViewMode] = useState<'list' | 'depth'>('list');

  // 누적 데이터 계산 (메모이제이션)
  // Compute cumulative data (memoized)
  const { asksCum, bidsCum, maxTotal, bestBid: _bestBid, bestAsk: _bestAsk, spread, midPrice, spreadPercent } =
    useMemo(() => {
      // 매도: 가격 오름차순 정렬 후 누적
      // Asks: sort ascending, cumulate
      const sortedAsks = [...orderBook.asks].sort((a, b) => a.price - b.price);
      const rawAsksCum = assignDepthPercent(computeCumulative(sortedAsks));

      // 매수: 가격 내림차순 정렬 후 누적
      // Bids: sort descending, cumulate
      const sortedBids = [...orderBook.bids].sort((a, b) => b.price - a.price);
      const rawBidsCum = assignDepthPercent(computeCumulative(sortedBids));

      // 전체 최대 total (개별 레벨 바 기준)
      // Max individual total for single-level bar width
      const maxT = Math.max(
        ...orderBook.asks.map((a) => a.total),
        ...orderBook.bids.map((b) => b.total),
        1,
      );

      const bBid = sortedBids.length > 0 ? sortedBids[0].price : 0;
      const bAsk = sortedAsks.length > 0 ? sortedAsks[0].price : 0;
      const sp = orderBook.spread ?? (bAsk > 0 && bBid > 0 ? bAsk - bBid : 0);
      const mid = bAsk > 0 && bBid > 0 ? (bAsk + bBid) / 2 : 0;
      const spPct = mid > 0 ? (sp / mid) * 100 : 0;

      return {
        asksCum: rawAsksCum,
        bidsCum: rawBidsCum,
        maxTotal: maxT,
        bestBid: bBid,
        bestAsk: bAsk,
        spread: sp,
        midPrice: mid,
        spreadPercent: spPct,
      };
    }, [orderBook]);

  // 표시할 레벨 (상위 N개) / Visible levels (top N)
  // 매도: 가격 높은 순부터 보여주고 아래로 갈수록 best ask
  // Asks: show from highest price down to best ask
  const visibleAsks = useMemo(() => {
    const reversed = [...asksCum].reverse();
    return reversed.slice(0, VISIBLE_LEVELS);
  }, [asksCum]);

  const visibleBids = useMemo(() => {
    return bidsCum.slice(0, VISIBLE_LEVELS);
  }, [bidsCum]);

  const handleViewToggle = useCallback((mode: 'list' | 'depth') => {
    setViewMode(mode);
  }, []);

  return (
    // MOB-M-01: overflow-x-auto 추가 — 320px 좁은 화면에서 가로 스크롤 허용
    // MOB-M-01: Add overflow-x-auto — allow horizontal scroll on 320px narrow screens
    // RD-M-04: min-w-0 추가 — flex 자식 내에서 오버플로우 올바르게 처리
    // RD-M-04: Add min-w-0 — handle overflow correctly within flex children
    <div className="overflow-x-auto min-w-0">
      {/* 뷰 토글 / View toggle */}
      <div className="flex items-center gap-1 mb-3">
        <button
          onClick={() => handleViewToggle('list')}
          className={cn(
            'px-2.5 py-1 text-[12px] rounded-md transition-colors',
            viewMode === 'list'
              ? 'bg-bg-tertiary text-text-primary font-semibold'
              : 'text-text-quaternary hover:text-text-tertiary',
          )}
        >
          {t('orderbook.listView')}
        </button>
        <button
          onClick={() => handleViewToggle('depth')}
          className={cn(
            'px-2.5 py-1 text-[12px] rounded-md transition-colors',
            viewMode === 'depth'
              ? 'bg-bg-tertiary text-text-primary font-semibold'
              : 'text-text-quaternary hover:text-text-tertiary',
          )}
        >
          {t('orderbook.depthChart')}
        </button>
      </div>

      {viewMode === 'depth' ? (
        <DepthChart asks={asksCum} bids={bidsCum} fp={fp} />
      ) : (
        <>
          {/* INF-L-04: 헤더 라벨에 aria-label 추가 — 접근성 향상 / Add aria-label to header labels — a11y improvement */}
          {/* INF-L-02: 모바일에서 누적 컬럼 숨김 — 데이터 밀도 최적화 / Hide cumulative column on mobile — data density optimization */}
          <div className="flex text-[11px] sm:text-[12px] text-text-quaternary py-2 font-medium" role="row" aria-label="Order book header">
            <span className="flex-1">{t('orderbook.price')}</span>
            <span className="flex-1 text-right">{t('orderbook.quantity')}</span>
            <span className="w-14 sm:w-16 text-right hidden sm:block">{t('orderbook.cumulative')}</span>
          </div>

          {/* 매도 호가 / Asks (sell orders) — 가격 높은 순 → 낮은 순 */}
          <div className="space-y-px py-1">
            {visibleAsks.map((ask, i) => (
              <div key={`ask-${i}`} className="relative flex items-center py-[6px] sm:py-[7px] rounded-lg">
                {/* 개별 수량 바 / Individual volume bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-fall/[0.06] rounded-lg"
                  style={{ width: `${(ask.total / maxTotal) * 100}%` }}
                />
                {/* 누적 깊이 바 / Cumulative depth bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-fall/[0.03] rounded-lg"
                  style={{ width: `${ask.depthPercent}%` }}
                />
                <span className="flex-1 text-[13px] sm:text-[14px] tabular-nums text-fall font-medium relative z-10">
                  {fp(ask.price)}
                </span>
                <span className="flex-1 text-[13px] sm:text-[14px] tabular-nums text-text-secondary text-right relative z-10">
                  {formatQuantity(ask.quantity)}
                </span>
                {/* INF-L-02: 모바일에서 누적 컬럼 숨김 / Hide cumulative on mobile */}
                <span className="w-14 sm:w-16 text-[11px] sm:text-[12px] tabular-nums text-text-quaternary text-right relative z-10 hidden sm:block">
                  {formatQuantity(ask.cumTotal)}
                </span>
              </div>
            ))}
          </div>

          {/* 스프레드 + 중앙가 / Spread + Mid Price */}
          <div className="py-3 my-1 border-y border-border/40">
            <div className="flex items-center justify-between gap-2 flex-wrap md:flex-nowrap">
              {/* 스프레드 / Spread */}
              <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                <span className="text-[10px] md:text-[11px] text-text-quaternary font-medium shrink-0">
                  {t('orderbook.spread')}
                </span>
                <span className="text-[12px] sm:text-[13px] md:text-[14px] text-text-secondary font-semibold tabular-nums truncate">
                  {fp(spread)}
                </span>
                <span className="text-[10px] md:text-[11px] text-text-quaternary tabular-nums shrink-0">
                  ({spreadPercent.toFixed(2)}%)
                </span>
              </div>

              {/* 중앙가 / Mid Price */}
              {midPrice > 0 && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] md:text-[11px] text-text-quaternary font-medium shrink-0">
                    {t('orderbook.midPrice')}
                  </span>
                  <span className="text-[12px] sm:text-[13px] md:text-[14px] text-text-primary font-bold tabular-nums truncate">
                    {fp(midPrice)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 매수 호가 / Bids (buy orders) — 가격 높은 순 → 낮은 순 */}
          <div className="space-y-px py-1">
            {visibleBids.map((bid, i) => (
              <div key={`bid-${i}`} className="relative flex items-center py-[6px] sm:py-[7px] rounded-lg">
                {/* 개별 수량 바 / Individual volume bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-rise/[0.06] rounded-lg"
                  style={{ width: `${(bid.total / maxTotal) * 100}%` }}
                />
                {/* 누적 깊이 바 / Cumulative depth bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-rise/[0.03] rounded-lg"
                  style={{ width: `${bid.depthPercent}%` }}
                />
                <span className="flex-1 text-[13px] sm:text-[14px] tabular-nums text-rise font-medium relative z-10">
                  {fp(bid.price)}
                </span>
                <span className="flex-1 text-[13px] sm:text-[14px] tabular-nums text-text-secondary text-right relative z-10">
                  {formatQuantity(bid.quantity)}
                </span>
                {/* INF-L-02: 모바일에서 누적 컬럼 숨김 / Hide cumulative on mobile */}
                <span className="w-14 sm:w-16 text-[11px] sm:text-[12px] tabular-nums text-text-quaternary text-right relative z-10 hidden sm:block">
                  {formatQuantity(bid.cumTotal)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
