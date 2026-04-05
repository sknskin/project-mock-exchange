/**
 * @file 포트폴리오 분석 개요 컴포넌트
 * @description 요약 카드 + P&L 분석 + 거래 활동 + 값 구성
 *
 * @file Portfolio Analytics Overview Component
 * @description Summary cards + P&L breakdown + trading activity + value composition
 */
'use client';

import { useMemo } from 'react';
import { cn, formatPercent } from '@/lib/format';
import {
  Wallet,
  TrendingUp,
  ArrowLeftRight,
  Layers,
} from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';
import type { Portfolio } from '@/types';
import type { Order } from '@/types';

const CHART_COLORS = [
  '#3182F6', '#F04452', '#00BFA5', '#FF8A00', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F59E0B', '#6366F1', '#10B981',
];

interface AnalyticsOverviewProps {
  portfolio: Portfolio;
  filledOrders: Order[] | undefined;
  fmt: (v: number) => string;
  t: (key: TranslationKey) => string;
}

/**
 * 분석 개요 — 요약, P&L, 거래 활동, 값 구성
 * Analytics overview — summary, P&L, trading activity, value composition
 */
export default function AnalyticsOverview({ portfolio, filledOrders, fmt, t }: AnalyticsOverviewProps) {
  const { unrealizedPnl, realizedPnl, totalPnl } = portfolio;

  // --- Trading Activity Summary ---
  const tradingActivity = useMemo(() => {
    if (!filledOrders || filledOrders.length === 0) {
      return { totalTrades: 0, buyCount: 0, sellCount: 0, totalBuyVolume: 0, totalSellVolume: 0 };
    }

    let buyCount = 0;
    let sellCount = 0;
    let totalBuyVolume = 0;
    let totalSellVolume = 0;

    filledOrders.forEach((order) => {
      const value = (order.filledPrice ?? order.price ?? 0) * (order.filledQuantity || order.quantity);
      if (order.side === 'BUY') {
        buyCount++;
        totalBuyVolume += value;
      } else {
        sellCount++;
        totalSellVolume += value;
      }
    });

    return {
      totalTrades: filledOrders.length,
      buyCount,
      sellCount,
      totalBuyVolume,
      totalSellVolume,
    };
  }, [filledOrders]);

  // --- Portfolio Value Composition (horizontal stacked bar) ---
  const compositionData = useMemo(() => {
    const totalValue = portfolio.totalValue || 1;
    const items: { name: string; value: number; percent: number; color: string }[] = [];

    if (portfolio.cashBalance > 0) {
      items.push({
        name: t('portfolio.analytics.cash'),
        value: portfolio.cashBalance,
        percent: (portfolio.cashBalance / totalValue) * 100,
        color: '#4E5968',
      });
    }

    portfolio.holdings
      .slice()
      .sort((a, b) => b.value - a.value)
      .forEach((h, i) => {
        items.push({
          name: h.name || h.symbol,
          value: h.value,
          percent: (h.value / totalValue) * 100,
          color: CHART_COLORS[i % CHART_COLORS.length],
        });
      });

    return items;
  }, [portfolio, t]);

  return (
    <>
      {/* Portfolio Summary Cards */}
      <section className="py-4 border-b border-border/60">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-accent" />
          <h2 className="text-[14px] font-bold text-text-secondary">
            {t('portfolio.analytics.summary')}
          </h2>
        </div>
        <p className="text-[12px] text-text-quaternary mb-4">
          {t('portfolio.analytics.summaryDesc')}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-bg-secondary">
            <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.netDeposit')}</div>
            <div className="text-[16px] font-bold text-text-primary tabular-nums">{fmt(portfolio.netDeposit)}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-bg-secondary">
            <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.totalAssets')}</div>
            <div className="text-[16px] font-bold text-text-primary tabular-nums">{fmt(portfolio.totalValue)}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-bg-secondary">
            <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.analytics.totalReturn')}</div>
            <div className={cn('text-[16px] font-bold tabular-nums', totalPnl >= 0 ? 'text-rise' : 'text-fall')}>
              {formatPercent(portfolio.totalPnlPercent)}
            </div>
            <div className="text-[11px] text-text-quaternary mt-0.5">{t('portfolio.totalReturnDesc')}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-bg-secondary">
            <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.cashBalance')}</div>
            <div className="text-[16px] font-bold text-text-primary tabular-nums">{fmt(portfolio.cashBalance)}</div>
          </div>
          {portfolio.totalCost > 0 && (
            <div className="p-3.5 rounded-xl bg-bg-secondary">
              <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.totalCost')}</div>
              <div className="text-[16px] font-bold text-text-primary tabular-nums">{fmt(portfolio.totalCost)}</div>
            </div>
          )}
          {portfolio.totalMarketValue > 0 && (
            <div className="p-3.5 rounded-xl bg-bg-secondary">
              <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.totalMarketValue')}</div>
              <div className="text-[16px] font-bold text-text-primary tabular-nums">{fmt(portfolio.totalMarketValue)}</div>
            </div>
          )}
        </div>
      </section>

      {/* P&L Breakdown */}
      <section className="py-4 border-b border-border/60">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-accent" />
          <h2 className="text-[14px] font-bold text-text-secondary">{t('portfolio.analytics.pnlBreakdown')}</h2>
        </div>
        <p className="text-[12px] text-text-quaternary mb-4">{t('portfolio.analytics.pnlBreakdownDesc')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-bg-secondary">
            <div className="text-[12px] text-text-tertiary mb-1">{t('portfolio.analytics.unrealizedPnl')}</div>
            <div className={cn('text-[18px] font-bold tabular-nums', unrealizedPnl >= 0 ? 'text-rise' : 'text-fall')}>
              {unrealizedPnl >= 0 ? '+' : ''}{fmt(unrealizedPnl)}
            </div>
            {portfolio.investedReturnPercent !== 0 && (
              <div className={cn('text-[12px] font-bold mt-0.5', portfolio.investedReturnPercent >= 0 ? 'text-rise' : 'text-fall')}>
                {formatPercent(portfolio.investedReturnPercent)}
              </div>
            )}
            <div className="text-[11px] text-text-quaternary mt-1">{t('portfolio.analytics.unrealizedDesc')}</div>
          </div>
          <div className="p-4 rounded-xl bg-bg-secondary">
            <div className="text-[12px] text-text-tertiary mb-1">{t('portfolio.analytics.realizedPnl')}</div>
            <div className={cn('text-[18px] font-bold tabular-nums', realizedPnl >= 0 ? 'text-rise' : 'text-fall')}>
              {realizedPnl >= 0 ? '+' : ''}{fmt(realizedPnl)}
            </div>
            <div className="text-[11px] text-text-quaternary mt-1">{t('portfolio.analytics.realizedDesc')}</div>
          </div>
          <div className="p-4 rounded-xl bg-bg-secondary">
            <div className="text-[12px] text-text-tertiary mb-1">{t('portfolio.analytics.totalPnl')}</div>
            <div className={cn('text-[18px] font-bold tabular-nums', totalPnl >= 0 ? 'text-rise' : 'text-fall')}>
              {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)}
            </div>
            <div className={cn('text-[12px] font-bold mt-0.5', totalPnl >= 0 ? 'text-rise' : 'text-fall')}>
              {formatPercent(portfolio.totalPnlPercent)}
            </div>
            <div className="text-[11px] text-text-quaternary mt-1">{t('portfolio.analytics.totalPnlDesc')}</div>
          </div>
        </div>
      </section>

      {/* Trading Activity Summary */}
      {tradingActivity.totalTrades > 0 && (
        <section className="py-4 border-b border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <ArrowLeftRight className="w-4 h-4 text-accent" />
            <h2 className="text-[14px] font-bold text-text-secondary">{t('portfolio.analytics.tradingActivity')}</h2>
          </div>
          <p className="text-[12px] text-text-quaternary mb-4">{t('portfolio.analytics.tradingActivityDesc')}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-bg-secondary">
              <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.analytics.totalTrades')}</div>
              <div className="text-[16px] font-bold text-text-primary tabular-nums">{tradingActivity.totalTrades}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-bg-secondary">
              <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.analytics.buyCount')}</div>
              <div className="text-[16px] font-bold text-rise tabular-nums">{tradingActivity.buyCount}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-bg-secondary">
              <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.analytics.sellCount')}</div>
              <div className="text-[16px] font-bold text-fall tabular-nums">{tradingActivity.sellCount}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-bg-secondary">
              <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.analytics.totalBuyVolume')}</div>
              <div className="text-[16px] font-bold text-rise tabular-nums">{fmt(tradingActivity.totalBuyVolume)}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-bg-secondary">
              <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.analytics.totalSellVolume')}</div>
              <div className="text-[16px] font-bold text-fall tabular-nums">{fmt(tradingActivity.totalSellVolume)}</div>
            </div>
          </div>
        </section>
      )}

      {/* Portfolio Value Composition — Horizontal Stacked Bar */}
      {compositionData.length > 0 && (
        <section className="py-4 border-b border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-accent" />
            <h2 className="text-[14px] font-bold text-text-secondary">{t('portfolio.analytics.valueComposition')}</h2>
          </div>
          <p className="text-[12px] text-text-quaternary mb-4">{t('portfolio.analytics.valueCompositionDesc')}</p>

          {/* 순수 CSS 수평 스택 바 / Pure CSS horizontal stacked bar */}
          <div className="flex h-[48px] rounded-xl overflow-hidden">
            {compositionData.map((item) => (
              <div
                key={item.name}
                className="h-full transition-all relative group"
                style={{ width: `${item.percent}%`, backgroundColor: item.color }}
              >
                {/* 호버 시 툴팁 / Tooltip on hover */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#1E1E24] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] text-[#ECECEC] whitespace-nowrap z-10">
                  {item.name}: {item.percent.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-3">
            {compositionData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[12px] text-text-primary truncate max-w-[100px]">{item.name}</span>
                <span className="text-[11px] text-text-tertiary tabular-nums">{item.percent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
