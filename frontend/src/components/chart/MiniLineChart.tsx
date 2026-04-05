/**
 * @file 경량 SVG 라인/영역 차트 컴포넌트
 * @description recharts 의존성 없이 순수 SVG로 렌더링하는 라인/영역 차트
 *
 * @file Lightweight SVG Line/Area Chart Component
 * @description Pure SVG line/area chart without recharts dependency
 */
'use client';

import { useMemo, useState, useCallback, useRef } from 'react';

// viewBox 600 기준 패딩 (1 unit ≈ 1px)
// Padding based on viewBox width 600 (1 unit ≈ 1px)
const PADDING = { top: 10, right: 15, bottom: 30, left: 55 };
const VIEW_WIDTH = 600;

interface DataPoint {
  label: string;
  value: number;
}

interface MiniLineChartProps {
  data: DataPoint[];
  height?: number;
  /** 라인 색상 / Line color */
  color?: string;
  /** 영역 그라데이션 활성화 / Enable area gradient fill */
  area?: boolean;
  /** 포맷 함수 / Tooltip value formatter */
  formatValue?: (v: number) => string;
  /** 차트 이름 (툴팁 레이블) / Chart name for tooltip label */
  name?: string;
}

/**
 * 경량 라인/영역 차트 — recharts 대체
 * Lightweight line/area chart — recharts replacement
 */
export default function MiniLineChart({
  data,
  height = 240,
  color = '#3182F6',
  area = false,
  formatValue = (v) => String(v),
  name = '',
}: MiniLineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: DataPoint } | null>(null);

  // 차트 영역 크기 계산 / Calculate chart area dimensions
  const chartWidth = VIEW_WIDTH;
  const chartHeight = height;
  const innerW = chartWidth - PADDING.left - PADDING.right;
  const innerH = chartHeight - PADDING.top - PADDING.bottom;

  // 데이터에서 Y축 범위 계산 / Calculate Y axis range from data
  const { minY, maxY, yTicks, points, areaPath, linePath } = useMemo(() => {
    if (data.length === 0) return { minY: 0, maxY: 1, yTicks: [0], points: [], areaPath: '', linePath: '' };

    const values = data.map((d) => d.value);
    let mn = Math.min(...values);
    let mx = Math.max(...values);

    // 동일 값일 때 패딩 추가 / Add padding for flat lines
    if (mn === mx) {
      mn = mn - 1;
      mx = mx + 1;
    }
    const rangePad = (mx - mn) * 0.1;
    mn -= rangePad;
    mx += rangePad;

    // Y축 틱 계산 (5개) / Calculate Y ticks (5 ticks)
    const tickCount = 5;
    const step = (mx - mn) / (tickCount - 1);
    const ticks = Array.from({ length: tickCount }, (_, i) => mn + step * i);

    // 좌표 매핑 / Map data to SVG coordinates
    const pts = data.map((d, i) => ({
      x: PADDING.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2),
      y: PADDING.top + (1 - (d.value - mn) / (mx - mn)) * innerH,
      data: d,
    }));

    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const aPath = pts.length > 0
      ? `${line} L${pts[pts.length - 1].x},${PADDING.top + innerH} L${pts[0].x},${PADDING.top + innerH} Z`
      : '';

    return { minY: mn, maxY: mx, yTicks: ticks, points: pts, areaPath: aPath, linePath: line };
  }, [data, innerW, innerH]);

  // X축 라벨 (최대 6개) / X axis labels (max 6)
  const xLabels = useMemo(() => {
    if (data.length <= 6) return data.map((d, i) => ({ label: d.label, index: i }));
    const step = Math.ceil(data.length / 5);
    const labels: { label: string; index: number }[] = [];
    for (let i = 0; i < data.length; i += step) labels.push({ label: data[i].label, index: i });
    if (labels[labels.length - 1].index !== data.length - 1) {
      labels.push({ label: data[data.length - 1].label, index: data.length - 1 });
    }
    return labels;
  }, [data]);

  // 마우스 이벤트 — 가장 가까운 포인트 탐색 / Mouse event — find nearest point
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || points.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const ratio = chartWidth / rect.width;
      const mx = (e.clientX - rect.left) * ratio;

      let nearest = points[0];
      let minDist = Math.abs(mx - nearest.x);
      for (let i = 1; i < points.length; i++) {
        const dist = Math.abs(mx - points[i].x);
        if (dist < minDist) { minDist = dist; nearest = points[i]; }
      }
      setTooltip({ x: nearest.x, y: nearest.y, point: nearest.data });
    },
    [points, chartWidth],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (data.length === 0) return null;

  // 그리드 Y 라인 / Grid Y lines
  const gridLines = yTicks.map((tick) => {
    const y = PADDING.top + (1 - (tick - minY) / (maxY - minY)) * innerH;
    return { y, label: formatValue(tick) };
  });

  const gradientId = `area-grad-${color.replace('#', '')}`;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className="w-full"
      style={{ height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 영역 그라데이션 정의 / Area gradient definition */}
      {area && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}

      {/* 그리드 라인 / Grid lines */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={PADDING.left} y1={g.y} x2={PADDING.left + innerW} y2={g.y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
          <text x={PADDING.left - 6} y={g.y + 4} textAnchor="end" fontSize={11} fill="#6B7683">{g.label}</text>
        </g>
      ))}

      {/* X축 라벨 / X axis labels */}
      {xLabels.map(({ label, index }) => {
        const x = PADDING.left + (data.length > 1 ? (index / (data.length - 1)) * innerW : innerW / 2);
        return (
          <text key={index} x={x} y={chartHeight - 6} textAnchor="middle" fontSize={10} fill="#6B7683">
            {label.length > 8 ? label.slice(5) : label}
          </text>
        );
      })}

      {/* 영역 / Area fill */}
      {area && areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

      {/* 라인 / Line */}
      {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth={2} />}

      {/* 툴팁 / Tooltip */}
      {tooltip && (
        <g>
          <line x1={tooltip.x} y1={PADDING.top} x2={tooltip.x} y2={PADDING.top + innerH} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
          <circle cx={tooltip.x} cy={tooltip.y} r={4} fill={color} stroke="#1E1E24" strokeWidth={2} />
          <rect x={tooltip.x - 70} y={tooltip.y - 38} width={140} height={30} rx={6} fill="#1E1E24" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          <text x={tooltip.x} y={tooltip.y - 16} textAnchor="middle" fontSize={11} fill="#ECECEC">
            {name ? `${name}: ` : ''}{formatValue(tooltip.point.value)}
          </text>
          <text x={tooltip.x} y={tooltip.y - 28} textAnchor="middle" fontSize={9} fill="#6B7683">{tooltip.point.label}</text>
        </g>
      )}
    </svg>
  );
}
