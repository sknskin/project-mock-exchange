/**
 * @file 스켈레톤 컴포넌트
 * @description 로딩 상태를 표시하는 스켈레톤 UI 컴포넌트
 *
 * @file Skeleton Component
 * @description Skeleton UI component for displaying loading states
 */
'use client';

import { cn } from '@/lib/format';

// 스켈레톤 Props / Skeleton Props
interface SkeletonProps {
  /** 추가 CSS 클래스 (크기, 모양 등)
   * Additional CSS classes (size, shape, etc.) */
  className?: string;
}

// 기본 스켈레톤 블록 — animate-pulse로 깜빡임 효과 / Base skeleton block — flicker effect via animate-pulse
export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-bg-secondary rounded animate-pulse',
        className,
      )}
    />
  );
}

// 자산 목록 로딩 스켈레톤 — 10행 레이아웃 / Asset list loading skeleton — 10-row layout
export function AssetListSkeleton() {
  return (
    <div className="pt-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center py-3.5">
          <Skeleton className="w-4 h-4 rounded-full mr-2" />
          <Skeleton className="w-7 h-4 shrink-0" />
          <div className="flex items-center gap-3 flex-1 pl-2.5">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="w-20 sm:w-24 h-3.5" />
              <Skeleton className="w-10 h-2.5" />
            </div>
          </div>
          <div className="space-y-1.5 mr-3">
            <Skeleton className="w-20 h-3.5 ml-auto" />
            <Skeleton className="w-14 h-2.5 ml-auto" />
          </div>
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-16 h-3.5 ml-3 hidden md:block" />
        </div>
      ))}
    </div>
  );
}

// 차트 로딩 스켈레톤 / Chart loading skeleton
export function ChartSkeleton() {
  return <Skeleton className="w-full h-[300px] rounded-none" />;
}

// 호가창 로딩 스켈레톤 — 매도/매수 각 8행 + 스프레드 바 / Order book loading skeleton — 8 ask/bid rows + spread bar
export function OrderBookSkeleton() {
  return (
    <div>
      {/* 뷰 토글 스켈레톤 / View toggle skeleton */}
      <div className="flex items-center gap-1 mb-3">
        <Skeleton className="w-16 h-6 rounded-md" />
        <Skeleton className="w-16 h-6 rounded-md" />
      </div>
      {/* 헤더 / Header */}
      <div className="flex py-2">
        <Skeleton className="w-12 h-3 flex-1" />
        <Skeleton className="w-12 h-3 flex-1 ml-auto" />
        <Skeleton className="w-10 h-3" />
      </div>
      {/* 매도 호가 / Ask rows */}
      <div className="space-y-px py-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`ask-${i}`} className="relative flex items-center py-[6px] rounded-lg">
            <div
              className="absolute right-0 top-0 bottom-0 bg-fall/[0.04] rounded-lg animate-pulse"
              style={{ width: `${30 + i * 8}%` }}
            />
            <Skeleton className="w-20 h-3.5 flex-1" />
            <Skeleton className="w-14 h-3.5 flex-1" />
            <Skeleton className="w-10 h-3" />
          </div>
        ))}
      </div>
      {/* 스프레드 바 / Spread bar */}
      <div className="py-3 my-1 border-y border-border/40">
        <div className="flex items-center gap-2">
          <Skeleton className="w-20 h-3.5" />
          <Skeleton className="w-24 h-3.5" />
        </div>
      </div>
      {/* 매수 호가 / Bid rows */}
      <div className="space-y-px py-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`bid-${i}`} className="relative flex items-center py-[6px] rounded-lg">
            <div
              className="absolute right-0 top-0 bottom-0 bg-rise/[0.04] rounded-lg animate-pulse"
              style={{ width: `${94 - i * 8}%` }}
            />
            <Skeleton className="w-20 h-3.5 flex-1" />
            <Skeleton className="w-14 h-3.5 flex-1" />
            <Skeleton className="w-10 h-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// 체결내역 로딩 스켈레톤 — 헤더 + 10행 / Recent trades loading skeleton — header + 10 rows
export function TradesSkeleton() {
  return (
    <div>
      {/* 헤더 / Header */}
      <div className="flex py-2.5">
        <Skeleton className="w-12 h-3 flex-1" />
        <Skeleton className="w-12 h-3 flex-1" />
        <Skeleton className="w-12 h-3 flex-1" />
      </div>
      {/* 체결 행 / Trade rows */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center py-2">
          <Skeleton className={cn('w-20 h-3.5 flex-1', i % 2 === 0 ? 'bg-rise/10' : 'bg-fall/10')} />
          <Skeleton className="w-14 h-3.5 flex-1" />
          <Skeleton className="w-12 h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}
