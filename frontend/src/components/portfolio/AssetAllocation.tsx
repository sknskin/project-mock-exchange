/**
 * @file 자산 배분 파이차트 컴포넌트
 * @description 포트폴리오 자산 배분을 파이차트와 범례로 시각화
 *
 * @file Asset Allocation Pie Chart Component
 * @description Visualizes portfolio asset allocation with pie chart and legend
 */
'use client';

import { useMemo } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import DonutChart from '@/components/chart/DonutChart';
import type { TranslationKey } from '@/lib/i18n';
import type { Portfolio } from '@/types';

const CHART_COLORS = [
  '#3182F6', '#F04452', '#00BFA5', '#FF8A00', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F59E0B', '#6366F1', '#10B981',
];

interface AssetAllocationProps {
  portfolio: Portfolio;
  fmt: (v: number) => string;
  t: (key: TranslationKey) => string;
}

/**
 * 자산 배분 — 파이차트 + 범례
 * Asset allocation — pie chart + legend
 */
export default function AssetAllocation({ portfolio, fmt, t }: AssetAllocationProps) {
  const allocationData = useMemo(() => {
    const items: { name: string; value: number; color: string }[] = [];

    portfolio.holdings
      .slice()
      .sort((a, b) => b.value - a.value)
      .forEach((h, i) => {
        items.push({
          name: h.name || h.symbol,
          value: h.value,
          color: CHART_COLORS[i % CHART_COLORS.length],
        });
      });

    if (portfolio.cashBalance > 0) {
      items.push({
        name: t('portfolio.analytics.cash'),
        value: portfolio.cashBalance,
        color: '#4E5968',
      });
    }

    return items;
  }, [portfolio, t]);

  if (allocationData.length === 0) return null;

  return (
    <section className="py-4 border-b border-border/60">
      <div className="flex items-center gap-2 mb-1">
        <PieChartIcon className="w-4 h-4 text-accent" />
        <h2 className="text-[14px] font-bold text-text-secondary">
          {t('portfolio.analytics.assetAllocation')}
        </h2>
      </div>
      <p className="text-[12px] text-text-quaternary mb-4 lg:mb-2">
        {t('portfolio.analytics.assetAllocationDesc')}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-6">
        {/* 도넛 차트 / Donut Chart */}
        {/* INF-M-03: SVG 차트에 role="img" aria-label 추가 — 접근성 / Add role="img" aria-label to SVG chart — a11y */}
        <div className="w-[180px] h-[180px] lg:w-[260px] lg:h-[260px] shrink-0 [&>div]:!w-full [&>div]:!h-full" role="img" aria-label={t('portfolio.analytics.assetAllocation')}>
          <DonutChart
            data={allocationData}
            size={260}
            thickness={0.24}
            formatValue={fmt}
          />
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2">
          {allocationData.map((item, i) => {
            const percent = portfolio.totalValue > 0
              ? ((item.value / portfolio.totalValue) * 100).toFixed(1)
              : '0.0';
            return (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[13px] text-text-primary truncate max-w-[140px]">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-text-tertiary tabular-nums">
                    {percent}%
                  </span>
                  <span className="text-[12px] text-text-secondary font-medium tabular-nums min-w-[80px] text-right">
                    {fmt(item.value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
