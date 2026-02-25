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

export function useLeaderboard() {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data } = await api.get('/api/portfolio/leaderboard');
      const raw: any[] = data.data ?? data;
      return raw.map((e: any) => ({
        rank: e.rank,
        userId: e.userId,
        username: e.username || '',
        name: e.name || '',
        totalValue: Number(e.totalPortfolioValue || e.totalValue || 0),
        pnlPercent: Number(e.pnlPercent || 0),
      }));
    },
    refetchInterval: 30000,
  });
}
