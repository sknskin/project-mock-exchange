'use client';

import { useLeaderboard } from '@/hooks/useLeaderboard';
import Skeleton from '@/components/ui/Skeleton';
import { cn, formatCurrency, formatPercent } from '@/lib/format';
import { Trophy } from 'lucide-react';

const medalColors: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-400',
  3: 'text-amber-600',
};

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useLeaderboard();

  return (
    <div>
      <div className="px-4 sm:px-6 py-6 flex items-center gap-2.5">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h1 className="text-[20px] font-extrabold text-text-primary">리더보드</h1>
      </div>

      {/* Table header */}
      <div className="flex items-center px-4 sm:px-6 py-2.5 text-[11px] text-text-quaternary font-medium border-b border-border/80">
        <span className="w-10 sm:w-12 text-center shrink-0">순위</span>
        <span className="flex-1 pl-2 min-w-0">사용자</span>
        <span className="w-24 sm:w-36 text-right shrink-0">총 자산</span>
        <span className="w-16 sm:w-24 text-right shrink-0">수익률</span>
      </div>

      {isLoading ? (
        <div className="space-y-1 px-4 sm:px-6 pt-2">
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
                className={cn(
                  'flex items-center px-4 sm:px-6 py-3.5',
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
