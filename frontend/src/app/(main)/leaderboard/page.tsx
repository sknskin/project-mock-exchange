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
      <div className="px-6 py-5 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h1 className="text-[20px] font-extrabold text-text-primary">리더보드</h1>
      </div>

      {/* Table header */}
      <div className="flex items-center px-6 py-2.5 text-[12px] text-text-quaternary font-medium border-b border-border">
        <span className="w-12 text-center">순위</span>
        <span className="flex-1 pl-2">사용자</span>
        <span className="w-36 text-right">총 자산</span>
        <span className="w-24 text-right">수익률</span>
      </div>

      {isLoading ? (
        <div className="space-y-1 px-6 pt-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <div>
          {leaderboard?.map((entry) => {
            const isTop3 = entry.rank <= 3;
            const isPositive = entry.pnlPercent >= 0;

            return (
              <div
                key={entry.userId}
                className={cn(
                  'flex items-center px-6 py-3.5',
                  isTop3 && 'bg-bg-secondary/30',
                )}
              >
                <div
                  className={cn(
                    'w-12 text-center text-[14px] font-bold',
                    medalColors[entry.rank] ?? 'text-text-quaternary',
                  )}
                >
                  {entry.rank}
                </div>

                <div className="flex items-center gap-3 flex-1 pl-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-[11px] font-bold text-text-secondary shrink-0">
                    {entry.username.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-semibold text-text-primary text-[14px] truncate">
                    {entry.username}
                  </span>
                </div>

                <span className="w-36 text-right text-[14px] text-text-secondary tabular-nums font-medium">
                  {formatCurrency(entry.totalValue)}
                </span>

                <span
                  className={cn(
                    'w-24 text-right text-[14px] font-semibold tabular-nums',
                    isPositive ? 'text-rise' : 'text-fall',
                  )}
                >
                  {formatPercent(entry.pnlPercent)}
                </span>
              </div>
            );
          })}

          {(!leaderboard || leaderboard.length === 0) && (
            <div className="py-20 text-center text-text-quaternary text-[14px]">
              리더보드 데이터가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
