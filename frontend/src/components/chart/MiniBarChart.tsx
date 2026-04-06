/**
 * @file 경량 SVG 바 차트 컴포넌트
 * @description recharts 의존성 없이 순수 SVG로 렌더링하는 바 차트
 *
 * @file Lightweight SVG Bar Chart Component
 * @description Pure SVG bar chart without recharts dependency
 */
'use client';

import { useMemo, useState, useCallback, useRef } from 'react';

// viewBox 600 기준 패딩 (1 unit ≈ 1px)
// Padding based on viewBox width 600 (1 unit ≈ 1px)
const PADDING = { top: 10, right: 15, bottom: 30, left: 55 };
const VIEW_WIDTH = 600;

interface BarDataPoint {
  label: string;
  /** 단일 값 또는 다중 값(스택) / Single value or multiple values (stacked) */
  values: { key: string; value: number; color: string }[];
}

interface MiniBarChartProps {
  data: BarDataPoint[];
  height?: number;
  /** 막대 너비 비율 (0~1) / Bar width ratio (0~1) */
  barWidthRatio?: number;
  /** 스택 모드 / Stacked mode */
  stacked?: boolean;
  /** 수평 레이아웃 / Horizontal layout */
  horizontal?: boolean;
  /** 값 포맷 / Value formatter */
  formatValue?: (v: number) => string;
  /** 범례 표시 / Show legend */
  showLegend?: boolean;
}

/**
 * 경량 바 차트 — recharts 대체
 * Lightweight bar chart — recharts replacement
 */
export default function MiniBarChart({
  data,
  height = 240,
  barWidthRatio = 0.6,
  stacked = false,
  horizontal: _horizontal = false,
  formatValue = (v) => String(v),
  showLegend = false,
}: MiniBarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);

  const chartWidth = VIEW_WIDTH;
  const innerW = chartWidth - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;

  // 최대값 계산 / Calculate max value
  const { maxVal, yTicks } = useMemo(() => {
    let mx = 0;
    data.forEach((d) => {
      if (stacked) {
        const sum = d.values.reduce((s, v) => s + v.value, 0);
        if (sum > mx) mx = sum;
      } else {
        d.values.forEach((v) => { if (v.value > mx) mx = v.value; });
      }
    });
    if (mx === 0) mx = 1;

    const tickCount = 5;
    const step = mx / (tickCount - 1);
    const ticks = Array.from({ length: tickCount }, (_, i) => step * i);
    return { maxVal: mx, yTicks: ticks };
  }, [data, stacked]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || data.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const ratio = chartWidth / rect.width;
      const mx = (e.clientX - rect.left) * ratio;
      const barW = innerW / data.length;
      const idx = Math.floor((mx - PADDING.left) / barW);
      setTooltipIdx(idx >= 0 && idx < data.length ? idx : null);
    },
    [data, innerW, chartWidth],
  );

  if (data.length === 0) return null;

  const barGroupW = innerW / data.length;
  const barW = barGroupW * barWidthRatio;

  // Y축 그리드 / Y axis grid
  const gridLines = yTicks.map((tick) => ({
    y: PADDING.top + (1 - tick / maxVal) * innerH,
    label: formatValue(tick),
  }));

  // 범례 키 수집 / Collect legend keys
  const legendKeys = useMemo(() => {
    if (!showLegend || data.length === 0) return [];
    return data[0].values.map((v) => ({ key: v.key, color: v.color }));
  }, [data, showLegend]);

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="w-full"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltipIdx(null)}
      >
        {/* 그리드 / Grid */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PADDING.left} y1={g.y} x2={PADDING.left + innerW} y2={g.y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
            <text x={PADDING.left - 6} y={g.y + 4} textAnchor="end" fontSize={11} fill="#6B7683">{g.label}</text>
          </g>
        ))}

        {/* 바 렌더링 / Render bars */}
        {data.map((d, i) => {
          const groupX = PADDING.left + i * barGroupW;
          const barX = groupX + (barGroupW - barW) / 2;

          if (stacked) {
            let cumHeight = 0;
            return (
              <g key={i}>
                {d.values.map((v, vi) => {
                  const h = (v.value / maxVal) * innerH;
                  const y = PADDING.top + innerH - cumHeight - h;
                  cumHeight += h;
                  return <rect key={vi} x={barX} y={y} width={barW} height={Math.max(h, 1)} rx={vi === d.values.length - 1 ? 3 : 0} fill={v.color} />;
                })}
              </g>
            );
          }

          // 그룹 바 / Grouped bars
          const subBarW = barW / d.values.length;
          return (
            <g key={i}>
              {d.values.map((v, vi) => {
                const h = (v.value / maxVal) * innerH;
                return <rect key={vi} x={barX + vi * subBarW} y={PADDING.top + innerH - h} width={subBarW * 0.85} height={Math.max(h, 1)} rx={3} fill={v.color} />;
              })}
            </g>
          );
        })}

        {/* X축 라벨 / X axis labels */}
        {data.map((d, i) => {
          const x = PADDING.left + i * barGroupW + barGroupW / 2;
          const label = d.label.length > 8 ? d.label.slice(5) : d.label;
          // 라벨이 너무 많으면 간격 조절 / Skip labels if too many
          if (data.length > 10 && i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
          return <text key={i} x={x} y={height - 6} textAnchor="middle" fontSize={10} fill="#6B7683">{label}</text>;
        })}

        {/* 툴팁 / Tooltip */}
        {tooltipIdx !== null && data[tooltipIdx] && (() => {
          const d = data[tooltipIdx];
          const x = PADDING.left + tooltipIdx * barGroupW + barGroupW / 2;
          const totalH = 24 + d.values.length * 16;
          return (
            <g>
              <line x1={x} y1={PADDING.top} x2={x} y2={PADDING.top + innerH} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
              <rect x={x - 80} y={PADDING.top + 4} width={160} height={totalH} rx={6} fill="#1E1E24" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
              <text x={x} y={PADDING.top + 18} textAnchor="middle" fontSize={10} fill="#6B7683">{d.label}</text>
              {d.values.map((v, vi) => (
                <text key={vi} x={x} y={PADDING.top + 32 + vi * 16} textAnchor="middle" fontSize={11} fill={v.color}>
                  {v.key}: {formatValue(v.value)}
                </text>
              ))}
            </g>
          );
        })()}
      </svg>

      {/* 범례 / Legend */}
      {showLegend && legendKeys.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-1">
          {legendKeys.map((lk) => (
            <div key={lk.key} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: lk.color }} />
              <span className="text-[11px] text-text-quaternary">{lk.key}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
