/**
 * @file 통계 페이지 공통 컴포넌트
 * @description 차트 카드, 빈 차트, 커스텀 툴팁, 트렌드 뱃지, 스파크라인, 개요 카드 등 공유 UI
 *
 * @file Stats page shared components
 * @description Shared UI: chart card, empty chart, custom tooltip, trend badge, sparkline, overview card
 */
'use client';

import React from 'react';
import { BarChart2, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import type { LucideIcon } from 'lucide-react';

// ===== 차트 테마 상수 — Recharts 차트에서 사용하는 색상 팔레트 / Chart theme constants — color palette used by Recharts =====
export const CHART_COLORS = {
  blue: '#3182F6',
  red: '#F04452',
  green: '#00C48C',
  purple: '#9333ea',
  gray: '#6B7683',
  yellow: '#F5A623',
};

export const TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-bg-elevated, #1E1E24)',
  borderColor: 'var(--color-border, rgba(255,255,255,0.1))',
  borderRadius: '8px',
  color: 'var(--color-text-primary, #fff)',
};

export const GRID_STROKE = 'var(--color-border, rgba(255,255,255,0.06))';
export const AXIS_TICK_FILL = 'var(--color-text-quaternary, #6B7683)';
export const AXIS_LINE_STROKE = 'var(--color-border, rgba(255,255,255,0.06))';

// ===== 공통 차트 카드 래퍼 — 제목 + 설명 + 차트 본체 / Shared chart card wrapper — title + description + chart body =====
export function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
      <h3 className="text-[14px] font-semibold text-text-primary mb-1">{title}</h3>
      {description && <p className="text-[12px] text-text-quaternary mb-3">{description}</p>}
      {!description && <div className="mb-3" />}
      {children}
    </div>
  );
}

// ===== Empty chart placeholder =====
export function EmptyChart({ height = 280 }: { height?: number }) {
  const { t } = useTranslation();
  return (
    <div style={{ height }} className="flex flex-col items-center justify-center text-text-quaternary">
      <BarChart2 className="w-8 h-8 mb-2 opacity-30" />
      <span className="text-[13px]">{t('stats.noChartData')}</span>
    </div>
  );
}

// ===== 차트 데이터 충분 여부 확인 — 최소 2개 이상의 데이터 포인트 필요 / Check if chart data is sufficient — needs at least 2 data points =====
export function hasChartData(data: unknown[] | undefined, minPoints = 2): boolean {
  return !!data && data.length >= minPoints;
}

// ===== 커스텀 툴팁 — Recharts 기본 툴팁 대신 다크 테마에 맞는 스타일 적용 / Custom tooltip — dark-theme styled replacement for Recharts default tooltip =====
export function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        backgroundColor: TOOLTIP_STYLE.backgroundColor,
        border: `1px solid ${TOOLTIP_STYLE.borderColor}`,
        borderRadius: TOOLTIP_STYLE.borderRadius,
        padding: '8px 12px',
      }}
    >
      {label && (
        <p className="text-[11px] text-text-quaternary mb-1">{label}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-[13px] font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ===== 트렌드 뱃지 — 양수(녹색), 음수(빨간), 0(회색) / Trend badge — positive(green), negative(red), zero(gray) =====
export function TrendBadge({ changePercent }: { changePercent: number }) {
  if (changePercent > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded-md">
        <ArrowUpRight className="w-3 h-3" />
        +{changePercent.toFixed(1)}%
      </span>
    );
  }
  if (changePercent < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded-md">
        <ArrowDownRight className="w-3 h-3" />
        {changePercent.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-text-quaternary bg-bg-tertiary px-1.5 py-0.5 rounded-md">
      <Minus className="w-3 h-3" />
      0%
    </span>
  );
}

// ===== KPI 카드용 미니 스파크라인 — SVG polyline으로 경량 추세 차트 표시 / Mini sparkline for KPI cards — lightweight trend chart using SVG polyline =====
export function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="shrink-0 opacity-60">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ===== 개요 카드 — 아이콘 + 값 + 트렌드 뱃지 + 스파크라인 / Overview card — icon + value + trend badge + sparkline =====
export function OverviewCard({
  icon: Icon,
  value,
  label,
  iconColor,
  changePercent,
  sparklineData,
}: {
  icon: LucideIcon;
  value?: number;
  label: string;
  iconColor: string;
  changePercent?: number;
  sparklineData?: number[];
}) {
  return (
    <div className="bg-bg-secondary rounded-2xl p-4 sm:p-5 border border-border flex items-center gap-3 sm:gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${iconColor}15` }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[20px] sm:text-[24px] font-extrabold text-text-primary tabular-nums">
            {value !== undefined ? value.toLocaleString() : '-'}
          </span>
          {changePercent !== undefined && <TrendBadge changePercent={changePercent} />}
        </div>
        <p className="text-[11px] sm:text-[12px] text-text-quaternary mt-0.5 truncate">{label}</p>
      </div>
      {sparklineData && <MiniSparkline data={sparklineData} color={iconColor} />}
    </div>
  );
}
