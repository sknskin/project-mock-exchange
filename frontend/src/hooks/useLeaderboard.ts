'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { LeaderboardEntry } from '@/types';

export function useLeaderboard() {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data } = await api.get('/api/portfolio/leaderboard');
      return data.data ?? data;
    },
    refetchInterval: 30000,
  });
}
