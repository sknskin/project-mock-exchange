/**
 * @file 위험 지표 + 원가 분석 컴포넌트
 * @description 포트폴리오 집중도, 분산 점수, 현금 여유 비율 + 종목별 원가 분석
 *
 * @file Risk Metrics + Cost Basis Component
 * @description Portfolio concentration, diversification score, cash cushion + per-asset cost analysis
 */
'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/format';
import { ShieldAlert, Calculator } from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';
import type { Portfolio } from '@/types';

interface RiskMetricsProps {
  portfolio: Portfolio;
  fmt: (v: number) => string;
  t: (key: TranslationKey) => string;
}

/**
 * 위험 지표 + 원가 분석 — 집중도, 분산, 현금 비율, 종목별 원가
 * Risk metrics + cost basis — concentration, diversification, cash ratio, per-asset cost
 */
export default function RiskMetrics({ portfolio, fmt, t }: RiskMetricsProps) {
  // --- Risk Metrics ---
  const riskMetrics = useMemo(() => {
    const holdingValues = portfolio.holdings.map((h) => h.value);
    const totalValue = portfolio.totalValue || 1;

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

    const cashCushion = (portfolio.cashBalance / totalValue) * 100;

    return { concentration, diversificationScore, cashCushion };
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

  return (
    <>
      {/* Risk Metrics */}
      {portfolio.holdings.length > 0 && (
        <section className="py-4 border-b border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-accent" />
            <h2 className="text-[14px] font-bold text-text-secondary">{t('portfolio.analytics.riskMetrics')}</h2>
          </div>
          <p className="text-[12px] text-text-quaternary mb-4">{t('portfolio.analytics.riskMetricsDesc')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-bg-secondary">
              <div className="text-[12px] text-text-tertiary mb-1">{t('portfolio.analytics.concentration')}</div>
              <div className="text-[18px] font-bold text-text-primary tabular-nums">{riskMetrics.concentration.toFixed(1)}%</div>
              <div className="text-[11px] text-text-quaternary mt-1">{t('portfolio.analytics.concentrationDesc')}</div>
            </div>
            <div className="p-4 rounded-xl bg-bg-secondary">
              <div className="text-[12px] text-text-tertiary mb-1">{t('portfolio.analytics.diversification')}</div>
              <div className="text-[18px] font-bold text-text-primary tabular-nums">{(riskMetrics.diversificationScore * 100).toFixed(0)}%</div>
              <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden mt-2">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${riskMetrics.diversificationScore * 100}%` }} />
              </div>
              <div className="text-[11px] text-text-quaternary mt-1">{t('portfolio.analytics.diversificationDesc')}</div>
            </div>
            <div className="p-4 rounded-xl bg-bg-secondary">
              <div className="text-[12px] text-text-tertiary mb-1">{t('portfolio.analytics.cashCushion')}</div>
              <div className="text-[18px] font-bold text-text-primary tabular-nums">{riskMetrics.cashCushion.toFixed(1)}%</div>
              <div className="text-[11px] text-text-quaternary mt-1">{t('portfolio.analytics.cashCushionDesc')}</div>
            </div>
          </div>
        </section>
      )}

      {/* Cost Basis Analysis */}
      {costBasisData.length > 0 && (
        <section className="py-4 border-b border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="w-4 h-4 text-accent" />
            <h2 className="text-[14px] font-bold text-text-secondary">{t('portfolio.analytics.costBasis')}</h2>
          </div>
          <p className="text-[12px] text-text-quaternary mb-4">{t('portfolio.analytics.costBasisDesc')}</p>

          <div className="space-y-3">
            {costBasisData.map((item) => {
              const isPositive = item.unrealizedGainLoss >= 0;
              return (
                <div key={item.symbol} className="p-3 rounded-xl bg-bg-secondary">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-text-primary">{item.name}</span>
                      <span className="text-[11px] text-text-quaternary">{item.symbol}</span>
                    </div>
                    <span className={cn('text-[14px] font-bold tabular-nums', isPositive ? 'text-rise' : 'text-fall')}>
                      {isPositive ? '+' : ''}{fmt(item.unrealizedGainLoss)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
                    <div>
                      <div className="text-text-quaternary">{t('portfolio.analytics.avgCost')}</div>
                      <div className="text-text-secondary font-medium tabular-nums">{fmt(item.averagePrice)}</div>
                    </div>
                    <div>
                      <div className="text-text-quaternary">{t('portfolio.analytics.curPrice')}</div>
                      <div className="text-text-secondary font-medium tabular-nums">{fmt(item.currentPrice)}</div>
                    </div>
                    <div>
                      <div className="text-text-quaternary">{t('portfolio.analytics.costTotal')}</div>
                      <div className="text-text-secondary font-medium tabular-nums">{fmt(item.costBasisTotal)}</div>
                    </div>
                    <div>
                      <div className="text-text-quaternary">{t('portfolio.analytics.marketTotal')}</div>
                      <div className="text-text-secondary font-medium tabular-nums">{fmt(item.marketValueTotal)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
