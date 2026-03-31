/**
 * @file 포트폴리오 분석 컴포넌트 (오케스트레이터)
 * @description 자산 배분, 손익 분석, 위험 지표 등 종합 분석 대시보드
 *
 * @file Portfolio Analytics Component (Orchestrator)
 * @description Comprehensive analytics dashboard: allocation, P&L, risk metrics
 */
'use client';

import { formatCurrencyDisplay } from '@/lib/format';
import { useTranslation } from '@/hooks/useTranslation';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useOrders } from '@/hooks/useOrders';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import AnalyticsOverview from './AnalyticsOverview';
import AssetAllocation from './AssetAllocation';
import PerformanceChart from './PerformanceChart';
import RiskMetrics from './RiskMetrics';
import { BarChart3 } from 'lucide-react';
import type { Portfolio } from '@/types';

interface PortfolioAnalyticsProps {
  portfolio: Portfolio;
}

/** 포트폴리오 분석 — 자산 배분, 손익, 위험 지표 등 종합 분석 대시보드
 * Portfolio analytics — comprehensive dashboard with allocation, P&L, risk metrics */
export default function PortfolioAnalytics({ portfolio }: PortfolioAnalyticsProps) {
  const { t } = useTranslation();
  const { query: { data: rateData } } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const rate = rateData?.rate;
  const fmt = (v: number) => formatCurrencyDisplay(v, currencyMode, rate);
  const { data: filledOrders } = useOrders('FILLED');

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
      <ExchangeRateBar />

      <AnalyticsOverview
        portfolio={portfolio}
        filledOrders={filledOrders}
        fmt={fmt}
        t={t}
      />

      <AssetAllocation
        portfolio={portfolio}
        fmt={fmt}
        t={t}
      />

      <RiskMetrics
        portfolio={portfolio}
        fmt={fmt}
        t={t}
      />

      <PerformanceChart
        portfolio={portfolio}
        filledOrders={filledOrders}
        fmt={fmt}
        t={t}
      />
    </div>
  );
}
