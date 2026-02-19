/**
 * @file 리더보드 페이지
 * @description 수익률 기준 상위 사용자 랭킹을 보여주는 페이지
 *
 * @file Leaderboard Page
 * @description Page showing top user rankings by return rate
 */
'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import Skeleton from '@/components/ui/Skeleton';
import { cn, formatCurrency, formatPercent } from '@/lib/format';
import { Trophy, RefreshCw } from 'lucide-react';

const medalColors: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-400',
  3: 'text-amber-600',
};

const ROW_HEIGHT = 52;

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${month}월 ${day}일 ${hours}:${minutes}:${seconds}`;
}

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading, dataUpdatedAt, refetch } = useLeaderboard();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const prevRankMap = useRef<Map<string, number>>(new Map());
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  useEffect(() => {
    if (!leaderboard) return;

    const prev = prevRankMap.current;

    leaderboard.forEach((entry) => {
      const el = rowRefs.current.get(entry.userId);
      if (!el) return;

      const prevRank = prev.get(entry.userId);
      if (prevRank !== undefined && prevRank !== entry.rank) {
        const delta = (prevRank - entry.rank) * ROW_HEIGHT;
        el.style.transition = 'none';
        el.style.transform = `translateY(${delta}px)`;
        // 리플로우 강제 / force reflow
        el.offsetHeight;
        el.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        el.style.transform = 'translateY(0)';
      }
    });

    const next = new Map<string, number>();
    leaderboard.forEach((entry) => next.set(entry.userId, entry.rank));
    prevRankMap.current = next;
  }, [leaderboard]);

  return (
    <div>
      <div className="py-6 flex items-center gap-2.5">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h1 className="text-[20px] font-extrabold text-text-primary">리더보드</h1>
      </div>

      {/* 기준 시간 + 새로고침 / Timestamp + Refresh */}
      <div className="flex items-center justify-between pb-4">
        <span className="text-[12px] text-text-quaternary">
          {dataUpdatedAt
            ? `${formatTimestamp(dataUpdatedAt)} 기준`
            : '데이터 로딩 중...'}
        </span>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-[12px] text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          새로고침
        </button>
      </div>

      {/* 테이블 헤더 / Table header */}
      <div className="flex items-center py-2.5 text-[11px] text-text-quaternary font-medium border-b border-border/80">
        <span className="w-10 sm:w-12 text-center shrink-0">순위</span>
        <span className="flex-1 pl-2 min-w-0">사용자</span>
        <span className="w-24 sm:w-36 text-right shrink-0">총 자산</span>
        <span className="w-16 sm:w-24 text-right shrink-0">수익률</span>
      </div>

      {isLoading ? (
        <div className="space-y-1 pt-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {leaderboard?.map((entry) => {
            const isTop3 = entry.rank <= 3;
            const isPositive = entry.pnlPercent >= 0;

            return (
              <div
                key={entry.userId}
                ref={(el) => {
                  if (el) rowRefs.current.set(entry.userId, el);
                }}
                className={cn(
                  'flex items-center py-3.5',
                  isTop3 && 'bg-bg-secondary/20',
                )}
              >
                <div
                  className={cn(
                    'w-10 sm:w-12 text-center text-[14px] font-bold shrink-0',
                    medalColors[entry.rank] ?? 'text-text-quaternary',
                  )}
                >
                  {entry.rank}
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3 flex-1 pl-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-[11px] font-bold text-text-secondary shrink-0 ring-1 ring-white/5">
                    {entry.username.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-semibold text-text-primary text-[14px] truncate">
                    {entry.username}
                  </span>
                </div>

                <span className="w-24 sm:w-36 text-right text-[13px] sm:text-[14px] text-text-secondary tabular-nums font-medium shrink-0">
                  {formatCurrency(entry.totalValue)}
                </span>

                <span
                  className={cn(
                    'w-16 sm:w-24 text-right text-[13px] sm:text-[14px] font-bold tabular-nums shrink-0',
                    isPositive ? 'text-rise' : 'text-fall',
                  )}
                >
                  {formatPercent(entry.pnlPercent)}
                </span>
              </div>
            );
          })}

          {(!leaderboard || leaderboard.length === 0) && (
            <div className="py-24 text-center text-text-quaternary text-[14px]">
              리더보드 데이터가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
