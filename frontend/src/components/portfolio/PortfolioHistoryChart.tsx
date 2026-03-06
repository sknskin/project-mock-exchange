/**
 * @file 포트폴리오 가치 히스토리 차트
 * @description SVG 기반 라인 차트로 포트폴리오 총 가치의 시간별 변동을 표시합니다.
 * 현재 플레이스홀더 데이터를 사용하며, 향후 실제 히스토리 데이터 연동 예정입니다.
 *
 * @file Portfolio Value History Chart
 * @description Displays portfolio total value over time using an SVG-based line chart.
 * Currently uses placeholder data; real historical data tracking will be added later.
 */
'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { cn, formatCurrencyDisplay } from '@/lib/format';

// 기간 선택 탭 타입 / Period selector tab type
type Period = '1W' | '1M' | '3M' | '1Y';

interface PortfolioHistoryChartProps {
  /** 현재 포트폴리오 총 가치 (KRW) / Current total portfolio value (KRW) */
  totalValue: number;
}

/**
 * 플레이스홀더 데이터 생성 — 현재 총 가치를 기반으로 과거 시뮬레이션 데이터를 만듭니다.
 * Generate placeholder data — creates simulated historical data based on current total value.
 *
 * @param totalValue - 현재 포트폴리오 총 가치 / Current portfolio total value
 * @param period - 선택된 기간 / Selected period
 * @returns 날짜와 값의 배열 / Array of date-value pairs
 */
function generatePlaceholderData(
  totalValue: number,
  period: Period,
): { date: Date; value: number }[] {
  const now = new Date();
  const points: { date: Date; value: number }[] = [];

  // 기간별 데이터 포인트 수와 간격(일) / Data point count and interval(days) per period
  const config: Record<Period, { count: number; intervalDays: number }> = {
    '1W': { count: 7, intervalDays: 1 },
    '1M': { count: 30, intervalDays: 1 },
    '3M': { count: 13, intervalDays: 7 },
    '1Y': { count: 12, intervalDays: 30 },
  };

  const { count, intervalDays } = config[period];
  // 시작 값은 현재 값의 85~95% 범위에서 설정 / Start value set between 85-95% of current value
  const startValue = totalValue * (0.85 + Math.random() * 0.1);
  const diff = totalValue - startValue;

  for (let i = 0; i <= count; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (count - i) * intervalDays);
    // 선형 성장 + 작은 무작위 변동 / Linear growth + small random fluctuation
    const progress = i / count;
    const noise = (Math.sin(i * 1.5) * 0.02 + (Math.random() - 0.5) * 0.01) * totalValue;
    const value = startValue + diff * progress + noise;
    points.push({ date, value: Math.max(0, value) });
  }

  return points;
}

export default function PortfolioHistoryChart({ totalValue }: PortfolioHistoryChartProps) {
  const { t } = useTranslation();
  const { display: currencyMode } = useCurrencyDisplay();
  const { data: rateData } = useExchangeRate();
  const rate = rateData?.rate ?? 0;

  // 선택된 기간 / Selected period
  const [period, setPeriod] = useState<Period>('1M');

  const periods: Period[] = ['1W', '1M', '3M', '1Y'];

  // 플레이스홀더 데이터 생성 (기간/총가치 변경 시 재계산) / Generate placeholder data (recalculated on period/value change)
  const data = useMemo(
    () => generatePlaceholderData(totalValue, period),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalValue, period],
  );

  // SVG 차트 치수 / SVG chart dimensions
  const width = 600;
  const height = 200;
  const paddingX = 0;
  const paddingY = 16;

  // 값 범위 계산 / Calculate value range
  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // 데이터 포인트를 SVG 좌표로 변환 / Convert data points to SVG coordinates
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
    const y = paddingY + (1 - (d.value - minVal) / range) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  // SVG path 문자열 생성 / Build SVG path string
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // 그라데이션 영역 path / Gradient area path
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  // 전체 기간 변동률 / Overall period change percentage
  const startVal = data[0]?.value ?? 0;
  const endVal = data[data.length - 1]?.value ?? 0;
  const changePercent = startVal > 0 ? ((endVal - startVal) / startVal) * 100 : 0;
  const isPositive = changePercent >= 0;

  return (
    <div className="py-4 border-b border-border/60">
      {/* 섹션 제목 + 기간 셀렉터 / Section header + period selector */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-bold text-text-secondary">
          {t('portfolio.historyChart.title')}
        </h2>
        <div className="flex gap-1 bg-bg-secondary rounded-lg p-0.5">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-2.5 py-1 text-[12px] font-semibold rounded-md transition-colors',
                period === p
                  ? 'bg-accent text-white'
                  : 'text-text-quaternary hover:text-text-secondary',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 변동률 표시 / Change percentage display */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[22px] font-bold text-text-primary tabular-nums">
          {formatCurrencyDisplay(endVal, currencyMode, rate)}
        </span>
        <span
          className={cn(
            'text-[13px] font-semibold tabular-nums',
            isPositive ? 'text-rise' : 'text-fall',
          )}
        >
          {isPositive ? '+' : ''}
          {changePercent.toFixed(2)}%
        </span>
      </div>

      {/* SVG 라인 차트 / SVG line chart */}
      <div className="w-full overflow-hidden rounded-xl bg-bg-secondary p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          preserveAspectRatio="none"
        >
          <defs>
            {/* 그라데이션 채우기 / Gradient fill */}
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={isPositive ? 'rgb(34,197,94)' : 'rgb(239,68,68)'}
                stopOpacity="0.25"
              />
              <stop
                offset="100%"
                stopColor={isPositive ? 'rgb(34,197,94)' : 'rgb(239,68,68)'}
                stopOpacity="0.02"
              />
            </linearGradient>
          </defs>

          {/* 영역 채우기 / Area fill */}
          <path d={areaPath} fill="url(#portfolioGradient)" />

          {/* 라인 / Line */}
          <path
            d={linePath}
            fill="none"
            stroke={isPositive ? 'rgb(34,197,94)' : 'rgb(239,68,68)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 마지막 포인트 표시 / Last point indicator */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="3.5"
              fill={isPositive ? 'rgb(34,197,94)' : 'rgb(239,68,68)'}
              stroke="white"
              strokeWidth="1.5"
            />
          )}
        </svg>
      </div>

      {/* 플레이스홀더 안내 / Placeholder notice */}
      <p className="text-[11px] text-text-quaternary mt-2 text-center">
        {t('portfolio.historyChart.placeholder')}
      </p>
    </div>
  );
}
