/**
 * @file 성과 차트 컴포넌트
 * @description 종목별 수익률 바 + 일별 누적 P&L 라인 차트
 *
 * @file Performance Chart Component
 * @description Per-asset performance bars + daily cumulative P&L line chart
 */
'use client';

import { useMemo } from 'react';
import { cn, formatPercent } from '@/lib/format';
import { BarChart3, Activity } from 'lucide-react';
import MiniLineChart from '@/components/chart/MiniLineChart';
import type { TranslationKey } from '@/lib/i18n';
import type { Portfolio, Order } from '@/types';

interface PerformanceChartProps {
  portfolio: Portfolio;
  filledOrders: Order[] | undefined;
  fmt: (v: number) => string;
  t: (key: TranslationKey) => string;
}

/**
 * 성과 차트 — 종목별 수익률 + 일별 누적 P&L
 * Performance chart — per-asset performance + daily cumulative P&L
 */
export default function PerformanceChart({ portfolio, filledOrders, fmt, t }: PerformanceChartProps) {
  // --- Daily P&L from filled orders ---
  const dailyPnlData = useMemo(() => {
    if (!filledOrders || filledOrders.length === 0) return [];

    const dailyMap = new Map<string, { buys: number; sells: number }>();

    filledOrders.forEach((order) => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { buys: 0, sells: 0 };
      const value = (order.filledPrice ?? order.price ?? 0) * (order.filledQuantity || order.quantity);

      if (order.side === 'BUY') {
        existing.buys += value;
      } else {
        existing.sells += value;
      }
      dailyMap.set(date, existing);
    });

    const entries = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { buys, sells }]) => ({
        date: date.slice(5),
        pnl: sells - buys,
      }));

    let cumulative = 0;
    return entries.map((entry) => {
      cumulative += entry.pnl;
      return { ...entry, cumPnl: cumulative };
    });
  }, [filledOrders]);

  return (
    <>
      {/* Per-Asset Performance */}
      {portfolio.holdings.length > 0 && (
        <section className="py-4 border-b border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-accent" />
            <h2 className="text-[14px] font-bold text-text-secondary">
              {t('portfolio.analytics.assetPerformance')}
            </h2>
          </div>
          <p className="text-[12px] text-text-quaternary mb-4">
            {t('portfolio.analytics.assetPerformanceDesc')}
          </p>

          <div className="space-y-3">
            {portfolio.holdings
              .slice()
              .sort((a, b) => b.pnlPercent - a.pnlPercent)
              .map((holding) => {
                const isPositive = holding.pnl >= 0;
                const invested = holding.averagePrice * holding.quantity;
                const barWidth = Math.min(Math.abs(holding.pnlPercent), 100);

                return (
                  <div key={holding.symbol} className="p-3 rounded-xl bg-bg-secondary">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-text-primary">{holding.name || holding.symbol}</span>
                        <span className="text-[11px] text-text-quaternary">{holding.symbol}</span>
                      </div>
                      <span className={cn('text-[14px] font-bold tabular-nums', isPositive ? 'text-rise' : 'text-fall')}>
                        {formatPercent(holding.pnlPercent)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden mb-2">
                      <div
                        className={cn('h-full rounded-full transition-all', isPositive ? 'bg-rise' : 'bg-fall')}
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-4">
                        <span className="text-text-quaternary">
                          {t('portfolio.analytics.invested')}{' '}
                          <span className="text-text-tertiary font-medium tabular-nums">{fmt(invested)}</span>
                        </span>
                        <span className="text-text-quaternary">
                          {t('portfolio.analytics.currentValue')}{' '}
                          <span className="text-text-tertiary font-medium tabular-nums">{fmt(holding.value)}</span>
                        </span>
                      </div>
                      <span className={cn('font-semibold tabular-nums', isPositive ? 'text-rise' : 'text-fall')}>
                        {isPositive ? '+' : ''}{fmt(holding.pnl)}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Daily P&L Line Chart */}
      {dailyPnlData.length > 1 && (
        <section className="py-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-accent" />
            <h2 className="text-[14px] font-bold text-text-secondary">
              {t('portfolio.analytics.dailyPnl')}
            </h2>
          </div>
          <p className="text-[12px] text-text-quaternary mb-4">
            {t('portfolio.analytics.dailyPnlDesc')}
          </p>

          {/* INF-M-03: SVG 차트에 role="img" aria-label 추가 — 접근성 / Add role="img" aria-label to SVG chart — a11y */}
          <div className="w-full" role="img" aria-label={t('portfolio.analytics.dailyPnl')}>
            <MiniLineChart
              data={dailyPnlData.map((d) => ({ label: d.date, value: d.cumPnl }))}
              height={200}
              color="#3182F6"
              area
              formatValue={fmt}
              name={t('portfolio.analytics.totalPnl')}
            />
          </div>
        </section>
      )}
    </>
  );
}
