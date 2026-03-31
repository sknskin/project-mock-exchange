/**
 * @file 포트폴리오 가치 히스토리 차트
 * @description 실제 거래 내역(입출금, 매매) 기반으로 포트폴리오 장부 가치의 시간별 변동을 SVG 차트로 표시합니다.
 *
 * @file Portfolio Value History Chart
 * @description Displays portfolio book value over time based on actual transactions (deposits, trades) using an SVG chart.
 */
'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useTransactions } from '@/hooks/usePortfolio';
import { cn, formatCurrencyDisplay } from '@/lib/format';

type Period = '1W' | '1M' | '3M' | '1Y';

interface PortfolioHistoryChartProps {
  totalValue: number;
}

const PERIOD_DAYS: Record<Period, number> = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
};

/**
 * 거래 내역에서 포트폴리오 장부 가치 시계열 데이터를 생성합니다.
 * 장부 가치 = 누적 입금 - 누적 출금 + 누적 실현 손익
 * 마지막 포인트는 현재 시가 평가액(totalValue)을 사용하여 미실현 손익도 반영합니다.
 *
 * Builds portfolio book value time-series from transaction history.
 * Book value = cumulative deposits - cumulative withdrawals + cumulative realized P&L
 * Last point uses current totalValue (includes unrealized P&L).
 */
function buildHistoryFromTransactions(
  transactions: { type: string; cashDelta: number; realizedPnL?: number; createdAt: string }[],
  period: Period,
  currentTotalValue: number,
): { date: Date; value: number }[] {
  if (!transactions || transactions.length === 0) return [];

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period]);

  // 시간순 정렬 (오래된 순)
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // 전체 거래에서 장부 가치 재구성
  // 장부 가치 변동 요인:
  //   DEPOSIT: +cashDelta (입금)
  //   WITHDRAWAL: +cashDelta (음수, 출금)
  //   SELL: +realizedPnL (실현 손익만 장부 가치 변동)
  //   BUY/RESERVE/RELEASE: 장부 가치 변동 없음 (자산 형태만 변환)
  let bookValue = 0;
  const allPoints: { date: Date; value: number }[] = [];

  for (const tx of sorted) {
    const txDate = new Date(tx.createdAt);

    if (tx.type === 'DEPOSIT' || tx.type === 'WITHDRAWAL') {
      bookValue += tx.cashDelta;
    } else if (tx.type === 'SELL' && tx.realizedPnL) {
      bookValue += tx.realizedPnL;
    }

    allPoints.push({ date: txDate, value: bookValue });
  }

  if (allPoints.length === 0) return [];

  // 기간 필터: cutoff 이전의 마지막 값을 시작점으로 사용
  let startValue = 0;
  const periodPoints: { date: Date; value: number }[] = [];

  for (const pt of allPoints) {
    if (pt.date < cutoff) {
      startValue = pt.value;
    } else {
      periodPoints.push(pt);
    }
  }

  // 시작점 추가 (기간 시작 시점의 장부 가치)
  if (startValue > 0 || periodPoints.length === 0) {
    periodPoints.unshift({ date: cutoff, value: startValue });
  }

  // 마지막 포인트를 현재 시가 평가액으로 설정 (미실현 손익 반영)
  periodPoints.push({ date: now, value: currentTotalValue });

  // 일별로 그룹핑하여 데이터 포인트 수를 적정 수준으로 유지
  const dayMap = new Map<string, { date: Date; value: number }>();
  for (const pt of periodPoints) {
    const key = pt.date.toISOString().slice(0, 10);
    dayMap.set(key, pt); // 같은 날이면 마지막 값 사용
  }

  const result = Array.from(dayMap.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  return result.length >= 2 ? result : [];
}

/** 포트폴리오 가치 히스토리 차트 — 거래 내역 기반 시계열 SVG 차트
 * Portfolio value history chart — time-series SVG chart based on transactions */
export default function PortfolioHistoryChart({ totalValue }: PortfolioHistoryChartProps) {
  const { t } = useTranslation();
  const theme = useSettingsStore((s) => s.theme);
  const isLight = theme === 'light';
  const { display: currencyMode } = useCurrencyDisplay();
  const { query: { data: rateData } } = useExchangeRate();
  const rate = rateData?.rate ?? 0;
  const { data: transactions, isLoading: txLoading } = useTransactions();

  const [period, setPeriod] = useState<Period>('1M');
  const periods: Period[] = ['1W', '1M', '3M', '1Y'];

  const data = useMemo(
    () => buildHistoryFromTransactions(transactions ?? [], period, totalValue),
    [transactions, period, totalValue],
  );

  // SVG 차트 치수 — 좌측 Y축 라벨 + 하단 X축 날짜 여백 확보
  const width = 600;
  const height = 220;
  const paddingLeft = 90;
  const paddingRight = 10;
  const paddingY = 16;
  const chartBottom = height - 24; // X축 라벨 공간

  // PF-M-03: 포인트 계산을 useMemo로 감싸 불필요한 재계산 방지 (totalValue 변경 시에만 재계산)
  // PF-M-03: Wrap points calculation in useMemo to avoid unnecessary recalculations (recalculates only on data change)
  const { points, linePath, areaPath, minVal, maxVal } = useMemo(() => {
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const pts = data.map((d, i) => {
      const x = paddingLeft + (i / (data.length - 1)) * (width - paddingLeft - paddingRight);
      const y = paddingY + (1 - (d.value - min) / range) * (chartBottom - paddingY);
      return { x, y, ...d };
    });

    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = pts.length > 0
      ? `${line} L ${pts[pts.length - 1].x} ${chartBottom} L ${pts[0].x} ${chartBottom} Z`
      : '';

    return { points: pts, linePath: line, areaPath: area, minVal: min, maxVal: max };
  }, [data, paddingLeft, paddingRight, paddingY, chartBottom, width]);

  // X축 날짜 라벨 (최대 5개) / X-axis date labels (max 5)
  const xLabels = useMemo(() => {
    if (data.length < 2) return [];
    const step = Math.max(1, Math.floor((data.length - 1) / 4));
    const labels: { x: number; label: string }[] = [];
    for (let i = 0; i < data.length; i += step) {
      const pt = points[i];
      if (pt) {
        const d = data[i].date;
        labels.push({ x: pt.x, label: `${d.getMonth() + 1}/${d.getDate()}` });
      }
    }
    // 마지막 포인트 항상 포함 / Always include last point
    const lastPt = points[points.length - 1];
    const lastD = data[data.length - 1].date;
    const lastLabel = `${lastD.getMonth() + 1}/${lastD.getDate()}`;
    if (!labels.length || labels[labels.length - 1].label !== lastLabel) {
      labels.push({ x: lastPt.x, label: lastLabel });
    }
    return labels;
  }, [data, points]);

  const hasData = data.length >= 2;

  // Y축 금액 라벨 (3단계) / Y-axis value labels (3 levels)
  const yLabels = useMemo(() => {
    if (!hasData) return [];
    const fmt = (v: number) => formatCurrencyDisplay(v, currencyMode, rate);
    const mid = (minVal + maxVal) / 2;
    return [
      { y: paddingY, label: fmt(maxVal) },
      { y: paddingY + (chartBottom - paddingY) / 2, label: fmt(mid) },
      { y: chartBottom, label: fmt(minVal) },
    ];
  }, [minVal, maxVal, hasData, currencyMode, rate, paddingY, chartBottom]);

  const startVal = data[0]?.value ?? 0;
  const endVal = data[data.length - 1]?.value ?? 0;
  const changePercent = startVal > 0 ? ((endVal - startVal) / startVal) * 100 : 0;
  const isPositive = changePercent >= 0;

  return (
    <div className="py-4 border-b border-border/60">
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

      {txLoading ? (
        <div className="w-full h-[200px] rounded-xl bg-bg-secondary animate-pulse" />
      ) : !hasData ? (
        <div className="w-full rounded-xl bg-bg-secondary p-8 text-center">
          <p className="text-[13px] text-text-quaternary">
            {t('portfolio.historyChart.noData')}
          </p>
        </div>
      ) : (
        <>
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

          {/* MOB-M-11: touch-action: manipulation — 모바일 핀치줌 허용 / Allow mobile pinch-zoom */}
          <div className="w-full overflow-hidden rounded-xl bg-bg-secondary p-3" style={{ touchAction: 'manipulation' }}>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto"
              preserveAspectRatio="none"
            >
              <defs>
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

              <path d={areaPath} fill="url(#portfolioGradient)" />

              <path
                d={linePath}
                fill="none"
                stroke={isPositive ? 'rgb(34,197,94)' : 'rgb(239,68,68)'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {points.length > 0 && (
                <circle
                  cx={points[points.length - 1].x}
                  cy={points[points.length - 1].y}
                  r="3.5"
                  fill={isPositive ? 'rgb(34,197,94)' : 'rgb(239,68,68)'}
                  stroke={isLight ? '#FFFFFF' : 'white'}
                  strokeWidth="1.5"
                />
              )}

              {/* Y축 금액 라벨 / Y-axis value labels */}
              {/* MOB-M-06: 축 라벨 크기 8→11px — 모바일 가독성 개선 / Axis label size 8→11px — improve mobile readability */}
              {yLabels.map((l, i) => (
                <text key={`y-${i}`} x={paddingLeft - 6} y={l.y + 3} textAnchor="end" fill={isLight ? '#4E5968' : '#808A98'} fontSize="11" fontFamily="inherit">
                  {l.label}
                </text>
              ))}

              {/* Y축 가이드 라인 / Y-axis guide lines */}
              {yLabels.map((l, i) => (
                <line key={`yg-${i}`} x1={paddingLeft} y1={l.y} x2={width - paddingRight} y2={l.y} stroke={isLight ? '#D8DCE1' : '#2A2A32'} strokeWidth="0.5" strokeDasharray="4 4" />
              ))}

              {/* X축 날짜 라벨 / X-axis date labels */}
              {/* MOB-M-06: 축 라벨 크기 8→11px — 모바일 가독성 개선 / Axis label size 8→11px — improve mobile readability */}
              {xLabels.map((l, i) => (
                <text key={`x-${i}`} x={l.x} y={chartBottom + 14} textAnchor="middle" fill={isLight ? '#4E5968' : '#808A98'} fontSize="11" fontFamily="inherit">
                  {l.label}
                </text>
              ))}
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
