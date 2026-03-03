/**
 * @file 리더보드 훅
 * @description TanStack Query로 수익률 기준 상위 사용자 랭킹을 조회합니다
 *
 * @file Leaderboard Hook
 * @description Fetches top user rankings by return rate via TanStack Query
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { LeaderboardEntry } from '@/types';

export type LeaderboardPeriod = 'all' | 'daily' | 'weekly' | 'monthly';
export type LeaderboardSortBy = 'return' | 'absolute' | 'assets';

interface UseLeaderboardOptions {
  period?: LeaderboardPeriod;
  sortBy?: LeaderboardSortBy;
}

export function useLeaderboard(options?: UseLeaderboardOptions) {
  const period = options?.period ?? 'all';
  const sortBy = options?.sortBy ?? 'return';

  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', period, sortBy],
    queryFn: async () => {
      // period와 sortBy는 향후 백엔드 지원 시 쿼리 파라미터로 전달 예정
      // period and sortBy will be passed as query params when backend supports them
      const { data } = await api.get('/api/portfolio/leaderboard');
      const raw: { rank: number; userId: string; username?: string; name?: string; totalPortfolioValue?: number; totalValue?: number; pnlPercent?: number }[] = data.data ?? data;
      return raw.map((e) => ({
        rank: e.rank,
        userId: e.userId,
        username: e.username || '',
        name: e.name || '',
        totalValue: Number(e.totalPortfolioValue || e.totalValue || 0),
        pnlPercent: Number(e.pnlPercent || 0),
      }));
    },
    refetchInterval: 10000,
  });
}
