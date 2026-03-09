/**
 * @file 포트폴리오 분석 컴포넌트
 * @description 자산 배분 파이차트, 손익 분석, 종목별 수익률, 일별 손익 차트,
 *              위험 지표, 원가 분석, 거래 활동, 포트폴리오 구성 바 차트
 *
 * @file Portfolio Analytics Component
 * @description Asset allocation pie chart, P&L breakdown, per-asset performance,
 *              daily P&L chart, risk metrics, cost basis, trading activity, value composition
 */
'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { cn, formatCurrencyDisplay, formatPercent } from '@/lib/format';
import { useTranslation } from '@/hooks/useTranslation';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useOrders } from '@/hooks/useOrders';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  BarChart3,
  Activity,
  Wallet,
  ShieldAlert,
  Calculator,
  ArrowLeftRight,
  Layers,
} from 'lucide-react';
import type { Portfolio } from '@/types';

interface PortfolioAnalyticsProps {
  portfolio: Portfolio;
}

const CHART_COLORS = [
  '#3182F6', '#F04452', '#00BFA5', '#FF8A00', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F59E0B', '#6366F1', '#10B981',
];

/** 포트폴리오 분석 — 자산 배분, 손익, 위험 지표 등 종합 분석 대시보드
 * Portfolio analytics — comprehensive dashboard with allocation, P&L, risk metrics */
export default function PortfolioAnalytics({ portfolio }: PortfolioAnalyticsProps) {
  const { t } = useTranslation();
  const { query: { data: rateData } } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const rate = rateData?.rate;
  const fmt = (v: number) => formatCurrencyDisplay(v, currencyMode, rate);
  const { data: filledOrders } = useOrders('FILLED');

  // --- Asset Allocation Pie Data ---
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

  // Use backend-computed P&L values directly
  const { unrealizedPnl, realizedPnl, totalPnl } = portfolio;

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

  // --- Risk Metrics ---
  const riskMetrics = useMemo(() => {
    const holdingValues = portfolio.holdings.map((h) => h.value);
    const totalHoldingValue = holdingValues.reduce((sum, v) => sum + v, 0);
    const totalValue = portfolio.totalValue || 1;

    // Top holding concentration
    const topHoldingValue = holdingValues.length > 0 ? Math.max(...holdingValues) : 0;
    const concentration = (topHoldingValue / totalValue) * 100;

    // HHI (Herfindahl-Hirschman Index) — includes cash as a "position"
    const allValues = [...holdingValues];
    if (portfolio.cashBalance > 0) allValues.push(portfolio.cashBalance);
    const hhi = allValues.reduce((sum, v) => {
      const share = v / totalValue;
      return sum + share * share;
    }, 0);
    const diversificationScore = Math.max(0, Math.min(1, 1 - hhi));

    // Cash cushion ratio
    const cashCushion = (portfolio.cashBalance / totalValue) * 100;

    return { concentration, diversificationScore, cashCushion, totalHoldingValue };
  }, [portfolio]);

  // --- Cost Basis Analysis ---
  const costBasisData = useMemo(() => {
    return portfolio.holdings.map((h) => {
      const costBasisTotal = h.averagePrice * h.quantity;
      const marketValueTotal = h.value;
      const unrealizedGainLoss = marketValueTotal - costBasisTotal;
      return {
        symbol: h.symbol,
        name: h.name || h.symbol,
        averagePrice: h.averagePrice,
        currentPrice: h.currentPrice,
        costBasisTotal,
        marketValueTotal,
        unrealizedGainLoss,
        quantity: h.quantity,
      };
    });
  }, [portfolio.holdings]);

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

  // Compose a single-row BarChart data entry for stacked bar
  const compositionBarData = useMemo(() => {
    const entry: Record<string, number> = {};
    compositionData.forEach((item) => {
      entry[item.name] = item.percent;
    });
    return [entry];
  }, [compositionData]);

  // --- Currency-aware YAxis tick formatter ---
  const yAxisTickFmt = (v: number) => fmt(v);

  // --- No data state ---
  if (portfolio.holdings.length === 0 && (!filledOrders || filledOrders.length === 0)) {
    return (
      <div className="space-y-2">
        <ExchangeRateBar />
        <div className="py-24 flex flex-col items-center text-center">
          <BarChart3 className="w-10 h-10 text-text-quaternary/40 mb-3" />
          <p className="text-text-quaternary text-[14px] whitespace-pre-line">
            {t('portfolio.analytics.noData')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Exchange Rate Bar */}
      <ExchangeRateBar />

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
          {/* Net Deposit */}
          <div className="p-3.5 rounded-xl bg-bg-secondary">
            <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.netDeposit')}</div>
            <div className="text-[16px] font-bold text-text-primary tabular-nums">
              {fmt(portfolio.netDeposit)}
            </div>
          </div>

          {/* Total Assets */}
          <div className="p-3.5 rounded-xl bg-bg-secondary">
            <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.totalAssets')}</div>
            <div className="text-[16px] font-bold text-text-primary tabular-nums">
              {fmt(portfolio.totalValue)}
            </div>
          </div>

          {/* Total Return */}
          <div className="p-3.5 rounded-xl bg-bg-secondary">
            <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.analytics.totalReturn')}</div>
            <div className={cn('text-[16px] font-bold tabular-nums', totalPnl >= 0 ? 'text-rise' : 'text-fall')}>
              {formatPercent(portfolio.totalPnlPercent)}
            </div>
            <div className="text-[11px] text-text-quaternary mt-0.5">{t('portfolio.totalReturnDesc')}</div>
          </div>

          {/* Cash Balance */}
          <div className="p-3.5 rounded-xl bg-bg-secondary">
            <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.cashBalance')}</div>
            <div className="text-[16px] font-bold text-text-primary tabular-nums">
              {fmt(portfolio.cashBalance)}
            </div>
          </div>

          {/* Total Cost */}
          {portfolio.totalCost > 0 && (
            <div className="p-3.5 rounded-xl bg-bg-secondary">
              <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.totalCost')}</div>
              <div className="text-[16px] font-bold text-text-primary tabular-nums">
                {fmt(portfolio.totalCost)}
              </div>
            </div>
          )}

          {/* Market Value */}
          {portfolio.totalMarketValue > 0 && (
            <div className="p-3.5 rounded-xl bg-bg-secondary">
              <div className="text-[11px] text-text-quaternary mb-1">{t('portfolio.totalMarketValue')}</div>
              <div className="text-[16px] font-bold text-text-primary tabular-nums">
                {fmt(portfolio.totalMarketValue)}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Asset Allocation Pie Chart */}
      {allocationData.length > 0 && (
        <section className="py-4 border-b border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <PieChartIcon className="w-4 h-4 text-accent" />
            <h2 className="text-[14px] font-bold text-text-secondary">
              {t('portfolio.analytics.assetAllocation')}
            </h2>
          </div>
          <p className="text-[12px] text-text-quaternary mb-4">
            {t('portfolio.analytics.assetAllocationDesc')}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Pie Chart */}
            <div className="w-[180px] h-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E1E24',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#ECECEC',
                    }}
                    formatter={(value?: number) => [fmt(value ?? 0), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
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
      )}

      {/* P&L Breakdown */}
      <section className="py-4 border-b border-border/60">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-accent" />
          <h2 className="text-[14px] font-bold text-text-secondary">
            {t('portfolio.analytics.pnlBreakdown')}
          </h2>
        </div>
        <p className="text-[12px] text-text-quaternary mb-4">
          {t('portfolio.analytics.pnlBreakdownDesc')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Unrealized P&L */}
          <div className="p-4 rounded-xl bg-bg-secondary">
            <div className="text-[12px] text-text-tertiary mb-1">
              {t('portfolio.analytics.unrealizedPnl')}
            </div>
            <div
              className={cn(
                'text-[18px] font-bold tabular-nums',
                unrealizedPnl >= 0 ? 'text-rise' : 'text-fall',
              )}
            >
              {unrealizedPnl >= 0 ? '+' : ''}{fmt(unrealizedPnl)}
            </div>
            {portfolio.investedReturnPercent !== 0 && (
              <div className={cn('text-[12px] font-bold mt-0.5', portfolio.investedReturnPercent >= 0 ? 'text-rise' : 'text-fall')}>
                {formatPercent(portfolio.investedReturnPercent)}
              </div>
            )}
            <div className="text-[11px] text-text-quaternary mt-1">
              {t('portfolio.analytics.unrealizedDesc')}
            </div>
          </div>

          {/* Realized P&L */}
          <div className="p-4 rounded-xl bg-bg-secondary">
            <div className="text-[12px] text-text-tertiary mb-1">
              {t('portfolio.analytics.realizedPnl')}
            </div>
            <div
              className={cn(
                'text-[18px] font-bold tabular-nums',
                realizedPnl >= 0 ? 'text-rise' : 'text-fall',
              )}
            >
              {realizedPnl >= 0 ? '+' : ''}{fmt(realizedPnl)}
            </div>
            <div className="text-[11px] text-text-quaternary mt-1">
              {t('portfolio.analytics.realizedDesc')}
            </div>
          </div>

          {/* Total P&L */}
          <div className="p-4 rounded-xl bg-bg-secondary">
            <div className="text-[12px] text-text-tertiary mb-1">
              {t('portfolio.analytics.totalPnl')}
            </div>
            <div
              className={cn(
                'text-[18px] font-bold tabular-nums',
                totalPnl >= 0 ? 'text-rise' : 'text-fall',
              )}
            >
              {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)}
            </div>
            <div className={cn(
              'text-[12px] font-bold mt-0.5',
              totalPnl >= 0 ? 'text-rise' : 'text-fall',
            )}>
              {formatPercent(portfolio.totalPnlPercent)}
            </div>
            <div className="text-[11px] text-text-quaternary mt-1">
              {t('portfolio.analytics.totalPnlDesc')}
            </div>
          </div>
        </div>
      </section>

      {/* Risk Metrics */}
      {portfolio.holdings.length > 0 && (
        <section className="py-4 border-b border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-accent" />
            <h2 className="text-[14px] font-bold text-text-secondary">
              {t('portfolio.analytics.riskMetrics')}
            </h2>
          </div>
          <p className="text-[12px] text-text-quaternary mb-4">
            {t('portfolio.analytics.riskMetricsDesc')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Portfolio Concentration */}
            <div className="p-4 rounded-xl bg-bg-secondary">
              <div className="text-[12px] text-text-tertiary mb-1">
                {t('portfolio.analytics.concentration')}
              </div>
              <div className="text-[18px] font-bold text-text-primary tabular-nums">
                {riskMetrics.concentration.toFixed(1)}%
              </div>
              <div className="text-[11px] text-text-quaternary mt-1">
                {t('portfolio.analytics.concentrationDesc')}
              </div>
            </div>

            {/* Diversification Score */}
            <div className="p-4 rounded-xl bg-bg-secondary">
              <div className="text-[12px] text-text-tertiary mb-1">
                {t('portfolio.analytics.diversification')}
              </div>
              <div className="text-[18px] font-bold text-text-primary tabular-nums">
                {(riskMetrics.diversificationScore * 100).toFixed(0)}%
              </div>
              <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${riskMetrics.diversificationScore * 100}%` }}
                />
              </div>
              <div className="text-[11px] text-text-quaternary mt-1">
                {t('portfolio.analytics.diversificationDesc')}
              </div>
            </div>

            {/* Cash Cushion */}
            <div className="p-4 rounded-xl bg-bg-secondary">
              <div className="text-[12px] text-text-tertiary mb-1">
                {t('portfolio.analytics.cashCushion')}
              </div>
              <div className="text-[18px] font-bold text-text-primary tabular-nums">
                {riskMetrics.cashCushion.toFixed(1)}%
              </div>
              <div className="text-[11px] text-text-quaternary mt-1">
                {t('portfolio.analytics.cashCushionDesc')}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Cost Basis Analysis */}
      {costBasisData.length > 0 && (
        <section className="py-4 border-b border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="w-4 h-4 text-accent" />
            <h2 className="text-[14px] font-bold text-text-secondary">
              {t('portfolio.analytics.costBasis')}
            </h2>
          </div>
          <p className="text-[12px] text-text-quaternary mb-4">
            {t('portfolio.analytics.costBasisDesc')}
          </p>

          <div className="space-y-3">
            {costBasisData.map((item) => {
              const isPositive = item.unrealizedGainLoss >= 0;
              return (
                <div key={item.symbol} className="p-3 rounded-xl bg-bg-secondary">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-text-primary">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-text-quaternary">
                        {item.symbol}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-[14px] font-bold tabular-nums',
                        isPositive ? 'text-rise' : 'text-fall',
                      )}
                    >
                      {isPositive ? '+' : ''}{fmt(item.unrealizedGainLoss)}
                    </span>
                  </div>

                  {/* Detail grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
                    <div>
                      <div className="text-text-quaternary">{t('portfolio.analytics.avgCost')}</div>
                      <div className="text-text-secondary font-medium tabular-nums">
                        {fmt(item.averagePrice)}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-quaternary">{t('portfolio.analytics.curPrice')}</div>
                      <div className="text-text-secondary font-medium tabular-nums">
                        {fmt(item.currentPrice)}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-quaternary">{t('portfolio.analytics.costTotal')}</div>
                      <div className="text-text-secondary font-medium tabular-nums">
                        {fmt(item.costBasisTotal)}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-quaternary">{t('portfolio.analytics.marketTotal')}</div>
                      <div className="text-text-secondary font-medium tabular-nums">
                        {fmt(item.marketValueTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Trading Activity Summary */}
      {tradingActivity.totalTrades > 0 && (
        <section className="py-4 border-b border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <ArrowLeftRight className="w-4 h-4 text-accent" />
            <h2 className="text-[14px] font-bold text-text-secondary">
              {t('portfolio.analytics.tradingActivity')}
            </h2>
          </div>
          <p className="text-[12px] text-text-quaternary mb-4">
            {t('portfolio.analytics.tradingActivityDesc')}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Total Trades */}
            <div className="p-3.5 rounded-xl bg-bg-secondary">
              <div className="text-[11px] text-text-quaternary mb-1">
                {t('portfolio.analytics.totalTrades')}
              </div>
              <div className="text-[16px] font-bold text-text-primary tabular-nums">
                {tradingActivity.totalTrades}
              </div>
            </div>

            {/* Buy Count */}
            <div className="p-3.5 rounded-xl bg-bg-secondary">
              <div className="text-[11px] text-text-quaternary mb-1">
                {t('portfolio.analytics.buyCount')}
              </div>
              <div className="text-[16px] font-bold text-rise tabular-nums">
                {tradingActivity.buyCount}
              </div>
            </div>

            {/* Sell Count */}
            <div className="p-3.5 rounded-xl bg-bg-secondary">
              <div className="text-[11px] text-text-quaternary mb-1">
                {t('portfolio.analytics.sellCount')}
              </div>
              <div className="text-[16px] font-bold text-fall tabular-nums">
                {tradingActivity.sellCount}
              </div>
            </div>

            {/* Total Buy Volume */}
            <div className="p-3.5 rounded-xl bg-bg-secondary">
              <div className="text-[11px] text-text-quaternary mb-1">
                {t('portfolio.analytics.totalBuyVolume')}
              </div>
              <div className="text-[16px] font-bold text-rise tabular-nums">
                {fmt(tradingActivity.totalBuyVolume)}
              </div>
            </div>

            {/* Total Sell Volume */}
            <div className="p-3.5 rounded-xl bg-bg-secondary">
              <div className="text-[11px] text-text-quaternary mb-1">
                {t('portfolio.analytics.totalSellVolume')}
              </div>
              <div className="text-[16px] font-bold text-fall tabular-nums">
                {fmt(tradingActivity.totalSellVolume)}
              </div>
            </div>
          </div>
        </section>
      )}

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
                  <div
                    key={holding.symbol}
                    className="p-3 rounded-xl bg-bg-secondary"
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-text-primary">
                          {holding.name || holding.symbol}
                        </span>
                        <span className="text-[11px] text-text-quaternary">
                          {holding.symbol}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'text-[14px] font-bold tabular-nums',
                          isPositive ? 'text-rise' : 'text-fall',
                        )}
                      >
                        {formatPercent(holding.pnlPercent)}
                      </span>
                    </div>

                    {/* Performance bar */}
                    <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden mb-2">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isPositive ? 'bg-rise' : 'bg-fall',
                        )}
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                    </div>

                    {/* Detail row */}
                    <div className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-4">
                        <span className="text-text-quaternary">
                          {t('portfolio.analytics.invested')}{' '}
                          <span className="text-text-tertiary font-medium tabular-nums">
                            {fmt(invested)}
                          </span>
                        </span>
                        <span className="text-text-quaternary">
                          {t('portfolio.analytics.currentValue')}{' '}
                          <span className="text-text-tertiary font-medium tabular-nums">
                            {fmt(holding.value)}
                          </span>
                        </span>
                      </div>
                      <span
                        className={cn(
                          'font-semibold tabular-nums',
                          isPositive ? 'text-rise' : 'text-fall',
                        )}
                      >
                        {isPositive ? '+' : ''}{fmt(holding.pnl)}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Portfolio Value Composition — Horizontal Stacked Bar */}
      {compositionData.length > 0 && (
        <section className="py-4 border-b border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-accent" />
            <h2 className="text-[14px] font-bold text-text-secondary">
              {t('portfolio.analytics.valueComposition')}
            </h2>
          </div>
          <p className="text-[12px] text-text-quaternary mb-4">
            {t('portfolio.analytics.valueCompositionDesc')}
          </p>

          <div className="w-full h-[48px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={compositionBarData}
                layout="vertical"
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis type="category" hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E1E24',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#ECECEC',
                  }}
                  formatter={(value?: number, name?: string) => [`${(value ?? 0).toFixed(1)}%`, name ?? '']}
                />
                {compositionData.map((item) => (
                  <Bar
                    key={item.name}
                    dataKey={item.name}
                    stackId="composition"
                    fill={item.color}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {compositionData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[12px] text-text-primary truncate max-w-[100px]">
                  {item.name}
                </span>
                <span className="text-[11px] text-text-tertiary tabular-nums">
                  {item.percent.toFixed(1)}%
                </span>
              </div>
            ))}
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

          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyPnlData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#6B7683' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6B7683' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={yAxisTickFmt}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E1E24',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#ECECEC',
                  }}
                  formatter={(value?: number) => [fmt(value ?? 0), t('portfolio.analytics.totalPnl')]}
                  labelFormatter={(label) => label}
                />
                <Line
                  type="monotone"
                  dataKey="cumPnl"
                  stroke="#3182F6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#3182F6', stroke: '#1E1E24', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
