'use client';

import { useLeaderboard } from '@/hooks/useLeaderboard';
import Skeleton from '@/components/ui/Skeleton';
import { cn, formatCurrency, formatPercent } from '@/lib/format';
import { Trophy } from 'lucide-react';

const rankColors = ['text-yellow-400', 'text-gray-400', 'text-amber-600'];

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useLeaderboard();

  return (
    <div>
      <div className="px-5 py-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h1 className="text-xl font-bold text-text-primary">리더보드</h1>
      </div>

      {isLoading ? (
        <div className="space-y-2 px-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-16" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {leaderboard?.map((entry) => {
            const isTop3 = entry.rank <= 3;
            const isPositive = entry.pnlPercent >= 0;

            return (
              <div
                key={entry.userId}
                className={cn(
                  'flex items-center gap-4 px-5 py-4',
                  isTop3 && 'bg-bg-secondary',
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    isTop3
                      ? `${rankColors[entry.rank - 1]} bg-bg-tertiary`
                      : 'text-text-tertiary',
                  )}
                >
                  {entry.rank}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-primary text-sm truncate">
                    {entry.username}
                  </div>
                  <div className="text-xs text-text-secondary tabular-nums">
                    {formatCurrency(entry.totalValue)}
                  </div>
                </div>

                <div
                  className={cn(
                    'text-sm font-medium tabular-nums',
                    isPositive ? 'text-rise' : 'text-fall',
                  )}
                >
                  {formatPercent(entry.pnlPercent)}
                </div>
              </div>
            );
          })}

          {(!leaderboard || leaderboard.length === 0) && (
            <div className="py-16 text-center text-text-secondary text-sm">
              리더보드 데이터가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
