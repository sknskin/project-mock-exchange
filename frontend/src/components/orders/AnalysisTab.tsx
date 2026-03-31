/**
 * @file 거래 분석 탭 컴포넌트
 * @description 거래 데이터를 기반으로 통계, 시간대별 분포, 종목별 내역을 분석
 *
 * @file Trade Analysis Tab Component
 * @description Analyzes trade data: stats, hourly distribution, symbol breakdown
 */
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Skeleton from '@/components/ui/Skeleton';
import ServiceError from '@/components/ui/ServiceError';
import { cn, formatPriceDisplay, formatCurrencyDisplay } from '@/lib/format';
import { Activity, LayoutDashboard } from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';
import type { TradeHistory } from '@/hooks/useOrders';

interface AnalysisTabProps {
  trades: TradeHistory[];
  userId: string;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  t: (key: TranslationKey) => string;
  currencyMode: 'krw' | 'original';
  rate?: number;
}

/**
 * 거래 분석 탭 — 총 거래수, 거래량, 승률, 시간대별 분포, 종목별 내역
 * Analysis tab — total trades, volume, win rate, hourly distribution, symbol breakdown
 */
export default function AnalysisTab({ trades, userId, isLoading, error, refetch, t, currencyMode, rate }: AnalysisTabProps) {
  // 통화 모드에 따라 가격을 포맷하는 헬퍼 / Helper to format price based on currency mode
  const fmt = (v: number, symbol: string) => formatPriceDisplay(v, symbol, currencyMode, rate);

  /**
   * 거래 데이터로부터 분석 통계를 계산 (메모이제이션)
   * 포함: 총 거래수, 총 거래량(KRW), 승률, 시간대별 분포, 종목별 내역
   *
   * Compute analysis stats from trade data (memoized):
   * Includes: total trades, total volume (KRW), win rate, hourly distribution, symbol breakdown
   */
  const stats = useMemo(() => {
    if (!trades.length) return null;

    const totalTrades = trades.length;
    // 총거래량을 KRW로 환산 — .KS 접미사가 없으면 USD 종목으로 간주하여 환율 곱하기
    // Convert total volume to KRW — symbols without .KS suffix are treated as USD and multiplied by rate
    const totalVolumeKrw = trades.reduce((sum, tr) => {
      const isUsd = !tr.symbol.endsWith('.KS');
      return sum + (isUsd && rate ? tr.total * rate : tr.total);
    }, 0);

    /**
     * 승률 계산: 종목별로 평균 매수가 vs 평균 매도가를 비교
     * 매도 평균가 > 매수 평균가이면 '승', 그렇지 않으면 '패'
     *
     * Win rate calculation: compare avg buy price vs avg sell price per symbol
     * avgSell > avgBuy = win, otherwise = loss
     */
    const symbolMap: Record<string, { buyTotal: number; buyQty: number; sellTotal: number; sellQty: number }> = {};
    for (const tr of trades) {
      if (!symbolMap[tr.symbol]) symbolMap[tr.symbol] = { buyTotal: 0, buyQty: 0, sellTotal: 0, sellQty: 0 };
      const isBuyer = tr.buyerId === userId;
      if (isBuyer) {
        symbolMap[tr.symbol].buyTotal += tr.price * tr.quantity;
        symbolMap[tr.symbol].buyQty += tr.quantity;
      } else {
        symbolMap[tr.symbol].sellTotal += tr.price * tr.quantity;
        symbolMap[tr.symbol].sellQty += tr.quantity;
      }
    }

    let wins = 0;
    let losses = 0;
    for (const sym of Object.keys(symbolMap)) {
      const s = symbolMap[sym];
      // 매수/매도 둘 다 있는 종목만 승패 판정 / Only evaluate symbols with both buy and sell trades
      if (s.buyQty > 0 && s.sellQty > 0) {
        const avgBuy = s.buyTotal / s.buyQty;
        const avgSell = s.sellTotal / s.sellQty;
        if (avgSell > avgBuy) wins++;
        else losses++;
      }
    }
    const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

    // 24시간 시간대별 거래 분포 — 바 차트 데이터 / 24-hour trading distribution — bar chart data
    const hourCounts = Array.from({ length: 24 }, () => 0);
    for (const tr of trades) {
      const hour = new Date(tr.executedAt).getHours();
      hourCounts[hour]++;
    }
    const maxHourCount = Math.max(...hourCounts, 1);

    // PF-M-02: Map 기반 O(N) 룩업으로 변환 — 기존 trades.filter() O(N*M) 중첩 제거
    // PF-M-02: Convert to Map-based O(N) lookup — eliminates nested trades.filter() O(N*M)
    const symbolBuyCounts = new Map<string, number>();
    const symbolSellCounts = new Map<string, number>();
    for (const tr of trades) {
      if (tr.buyerId === userId) {
        symbolBuyCounts.set(tr.symbol, (symbolBuyCounts.get(tr.symbol) ?? 0) + 1);
      }
      if (tr.sellerId === userId) {
        symbolSellCounts.set(tr.symbol, (symbolSellCounts.get(tr.symbol) ?? 0) + 1);
      }
    }

    // 종목별 매수/매도 횟수, 총수량, 평균가, 거래대금 집계 / Per-symbol breakdown: buy/sell counts, qty, avg price, volume
    const breakdown = Object.entries(symbolMap).map(([symbol, s]) => ({
      symbol,
      buyCount: symbolBuyCounts.get(symbol) ?? 0,
      sellCount: symbolSellCounts.get(symbol) ?? 0,
      totalQty: s.buyQty + s.sellQty,
      avgPrice: (s.buyTotal + s.sellTotal) / (s.buyQty + s.sellQty),
      volume: s.buyTotal + s.sellTotal,
    }));

    return { totalTrades, totalVolumeKrw, winRate, wins, losses, hourCounts, maxHourCount, breakdown };
  }, [trades, userId, rate]);

  /* Loading */
  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  /* Error */
  if (error) {
    return <ServiceError onRetry={refetch} />;
  }

  /* Empty */
  if (!trades.length || !stats) {
    return (
      <div className="py-24 flex flex-col items-center text-center">
        <Activity className="w-10 h-10 text-text-quaternary/40 mb-3" />
        <p className="text-text-quaternary text-[14px] whitespace-pre-line">
          {t('orders.analysisEmptyState')}
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-accent bg-accent/10 rounded-lg hover:bg-accent/20 transition-colors"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          {t('orders.goToDashboard')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[
          { label: t('orders.analysisTotalTrades'), value: stats.totalTrades.toLocaleString(), sub: t('orders.analysisTrades') },
          { label: t('orders.analysisTotalVolume'), value: formatCurrencyDisplay(stats.totalVolumeKrw, currencyMode, rate) },
          { label: t('orders.analysisAvgTradeSize'), value: formatCurrencyDisplay(stats.totalVolumeKrw / stats.totalTrades, currencyMode, rate) },
          {
            label: t('orders.analysisWinRate'),
            value: `${stats.winRate.toFixed(1)}%`,
            sub: `${t('orders.analysisWins')}: ${stats.wins} / ${t('orders.analysisLosses')}: ${stats.losses}`,
          },
        ].map((card) => (
          <div key={card.label} className="bg-bg-secondary/60 border border-border/60 rounded-xl px-3 md:px-4 py-3 md:py-4">
            <div className="text-[10px] md:text-[11px] text-text-quaternary font-medium mb-1 truncate">{card.label}</div>
            <div className="text-[16px] md:text-[18px] font-extrabold text-text-primary tabular-nums truncate">{card.value}</div>
            {card.sub && <div className="text-[10px] text-text-quaternary mt-0.5 truncate">{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* Time distribution chart */}
      <div>
        <h3 className="text-[15px] md:text-[16px] font-bold text-text-secondary mb-4">{t('orders.analysisTimeDistribution')}</h3>
        <div className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 md:p-6">
          {/* Vertical bar chart */}
          <div className="flex items-end gap-[3px] md:gap-[6px] h-[180px] md:h-[220px] mb-3">
            {stats.hourCounts.map((count, hour) => {
              const pct = (count / stats.maxHourCount) * 100;
              return (
                <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  {/* Tooltip on hover */}
                  {count > 0 && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center px-2 py-1 bg-bg-primary border border-border rounded-lg shadow-lg z-10 whitespace-nowrap">
                      <span className="text-[11px] md:text-[12px] font-semibold text-text-primary tabular-nums">
                        {String(hour).padStart(2, '0')}{t('orders.analysisTimeHour')} — {count}
                      </span>
                    </div>
                  )}
                  {/* Count label above bar (only show if non-zero) */}
                  {count > 0 && (
                    <span className="text-[10px] md:text-[11px] font-medium text-text-tertiary tabular-nums mb-1 leading-none">
                      {count}
                    </span>
                  )}
                  {/* Bar */}
                  <div
                    className={cn(
                      'w-full rounded-t-sm md:rounded-t transition-all',
                      count > 0 ? 'bg-accent hover:bg-accent/80' : 'bg-bg-tertiary/60',
                    )}
                    style={{ height: count > 0 ? `${Math.max(pct, 4)}%` : '2px' }}
                  />
                </div>
              );
            })}
          </div>
          {/* Hour labels below chart */}
          <div className="flex gap-[3px] md:gap-[6px]">
            {stats.hourCounts.map((_, hour) => (
              <div key={hour} className="flex-1 text-center">
                <span className="text-[9px] md:text-[11px] text-text-quaternary tabular-nums leading-none">
                  {String(hour).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
          {/* Axis legend */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
            <span className="text-[11px] md:text-[12px] text-text-quaternary">{t('orders.analysisTimeHour')}</span>
            <span className="text-[11px] md:text-[12px] text-text-quaternary">{t('orders.analysisTradeCount')}</span>
          </div>
        </div>
      </div>

      {/* Symbol breakdown table */}
      <div>
        <h3 className="text-[14px] font-bold text-text-secondary mb-3">{t('orders.analysisSymbolBreakdown')}</h3>
        <div className="bg-bg-secondary/60 border border-border/60 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-3 md:px-4 py-2.5 text-[11px] md:text-[12px] font-semibold text-text-quaternary">{t('orders.analysisSymbol')}</th>
                  <th className="px-3 md:px-4 py-2.5 text-[11px] md:text-[12px] font-semibold text-text-quaternary text-right">{t('orders.analysisBuyCount')}</th>
                  <th className="px-3 md:px-4 py-2.5 text-[11px] md:text-[12px] font-semibold text-text-quaternary text-right">{t('orders.analysisSellCount')}</th>
                  <th className="px-3 md:px-4 py-2.5 text-[11px] md:text-[12px] font-semibold text-text-quaternary text-right">{t('orders.analysisTotalQty')}</th>
                  <th className="px-3 md:px-4 py-2.5 text-[11px] md:text-[12px] font-semibold text-text-quaternary text-right">{t('orders.analysisAvgPrice')}</th>
                  <th className="px-3 md:px-4 py-2.5 text-[11px] md:text-[12px] font-semibold text-text-quaternary text-right">{t('orders.analysisVolume')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {stats.breakdown.map((row) => (
                  <tr key={row.symbol} className="hover:bg-bg-tertiary/40 transition-colors">
                    <td className="px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] font-semibold text-text-primary">{row.symbol}</td>
                    <td className="px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] text-rise tabular-nums text-right">{row.buyCount}</td>
                    <td className="px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] text-fall tabular-nums text-right">{row.sellCount}</td>
                    <td className="px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] text-text-secondary tabular-nums text-right">{row.totalQty.toLocaleString(undefined, { maximumFractionDigits: 8 })}</td>
                    <td className="px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] text-text-secondary tabular-nums text-right">{fmt(row.avgPrice, row.symbol)}</td>
                    <td className="px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] text-text-primary font-medium tabular-nums text-right">{fmt(row.volume, row.symbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
