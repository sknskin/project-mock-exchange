/**
 * @file 경량 SVG 도넛 차트 컴포넌트
 * @description recharts 의존성 없이 순수 SVG로 렌더링하는 도넛/파이 차트
 *
 * @file Lightweight SVG Donut Chart Component
 * @description Pure SVG donut/pie chart without recharts dependency
 */
'use client';

import { useMemo, useState, useCallback } from 'react';

interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  /** 차트 크기 (px) / Chart size in pixels */
  size?: number;
  /** 도넛 두께 비율 (0~1, 0이면 파이) / Donut thickness ratio (0~1, 0 = pie) */
  thickness?: number;
  /** 값 포맷 / Value formatter */
  formatValue?: (v: number) => string;
}

/**
 * 경량 도넛/파이 차트 — recharts 대체
 * Lightweight donut/pie chart — recharts replacement
 */
export default function DonutChart({
  data,
  size = 180,
  thickness = 0.24,
  formatValue = (v) => String(v),
}: DonutChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // 총합과 각도 계산 / Calculate total and angles
  const { total: _total, segments } = useMemo(() => {
    // 값이 0인 항목 제거 — 0° 세그먼트 방지
    // Filter out zero-value items — prevents 0° segments
    const filtered = data.filter((d) => d.value > 0);
    const tot = filtered.reduce((s, d) => s + d.value, 0);
    if (tot === 0 || filtered.length === 0) return { total: 0, segments: [] };

    const cx = 50;
    const cy = 50;
    const outerR = 40;
    const innerR = outerR * (1 - thickness);

    // 단일 세그먼트(100%)일 때 두 원(외곽 CW + 내곽 CCW) + evenodd로 도넛 구멍 생성
    // Single segment (100%): two circles (outer CW + inner CCW) + evenodd to punch donut hole
    if (filtered.length === 1) {
      const d = filtered[0];
      const path = thickness > 0
        ? [
            // 외곽 원 (시계 방향) / Outer circle (clockwise)
            `M${cx - outerR},${cy}`,
            `A${outerR},${outerR} 0 1,0 ${cx + outerR},${cy}`,
            `A${outerR},${outerR} 0 1,0 ${cx - outerR},${cy}`,
            'Z',
            // 내곽 원 (반시계 방향) — evenodd가 구멍을 생성
            // Inner circle (counter-clockwise) — evenodd creates the hole
            `M${cx - innerR},${cy}`,
            `A${innerR},${innerR} 0 1,1 ${cx + innerR},${cy}`,
            `A${innerR},${innerR} 0 1,1 ${cx - innerR},${cy}`,
            'Z',
          ].join(' ')
        : `M${cx - outerR},${cy} A${outerR},${outerR} 0 1,0 ${cx + outerR},${cy} A${outerR},${outerR} 0 1,0 ${cx - outerR},${cy} Z`;
      return {
        total: tot,
        segments: [{ ...d, path, percent: 100, useEvenOdd: true }],
      };
    }

    let currentAngle = -90; // 12시 방향에서 시작 / Start from 12 o'clock
    const segs = filtered.map((d) => {
      // 최대 359.9°로 제한 — arc 경로 붕괴 방지
      // Cap at 359.9° — prevents arc path collapse
      const angle = Math.min((d.value / tot) * 360, 359.9);
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      // SVG arc 경로 계산 / Calculate SVG arc path
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const largeArc = angle > 180 ? 1 : 0;

      const x1Outer = cx + outerR * Math.cos(startRad);
      const y1Outer = cy + outerR * Math.sin(startRad);
      const x2Outer = cx + outerR * Math.cos(endRad);
      const y2Outer = cy + outerR * Math.sin(endRad);

      const x1Inner = cx + innerR * Math.cos(endRad);
      const y1Inner = cy + innerR * Math.sin(endRad);
      const x2Inner = cx + innerR * Math.cos(startRad);
      const y2Inner = cy + innerR * Math.sin(startRad);

      const path = thickness > 0
        ? `M${x1Outer},${y1Outer} A${outerR},${outerR} 0 ${largeArc} 1 ${x2Outer},${y2Outer} L${x1Inner},${y1Inner} A${innerR},${innerR} 0 ${largeArc} 0 ${x2Inner},${y2Inner} Z`
        : `M${cx},${cy} L${x1Outer},${y1Outer} A${outerR},${outerR} 0 ${largeArc} 1 ${x2Outer},${y2Outer} Z`;

      return { ...d, path, percent: (d.value / tot) * 100, useEvenOdd: false };
    });

    return { total: tot, segments: segs };
  }, [data, thickness]);

  const handleHover = useCallback((idx: number | null) => setHoverIdx(idx), []);

  if (segments.length === 0) return null;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.path}
            fill={seg.color}
            fillRule={seg.useEvenOdd ? 'evenodd' : undefined}
            stroke="#0D0D11"
            strokeWidth={0.5}
            opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.5}
            className="transition-opacity duration-150"
            onMouseEnter={() => handleHover(i)}
            onMouseLeave={() => handleHover(null)}
          />
        ))}
      </svg>

      {/* 호버 툴팁 / Hover tooltip */}
      {hoverIdx !== null && segments[hoverIdx] && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-[11px] text-text-tertiary truncate max-w-[80px]">{segments[hoverIdx].name}</div>
            <div className="text-[14px] font-bold text-text-primary">{formatValue(segments[hoverIdx].value)}</div>
            <div className="text-[11px] text-text-quaternary">{segments[hoverIdx].percent.toFixed(1)}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
