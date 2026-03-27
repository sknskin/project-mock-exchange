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

// 리더보드 기간 필터 타입 / Leaderboard period filter type
export type LeaderboardPeriod = 'all' | 'daily' | 'weekly' | 'monthly';

// 리더보드 정렬 기준 타입 / Leaderboard sort criteria type
export type LeaderboardSortBy = 'return' | 'absolute' | 'assets';

// 리더보드 훅 옵션 인터페이스 / Leaderboard hook options interface
interface UseLeaderboardOptions {
  /** 조회 기간 (기본: 전체)
   * Query period (default: all) */
  period?: LeaderboardPeriod;
  /** 정렬 기준 (기본: 수익률)
   * Sort by (default: return rate) */
  sortBy?: LeaderboardSortBy;
}

/**
 * 수익률 기반 리더보드 데이터를 조회하는 훅
 * Hook that fetches leaderboard data ranked by return rate
 *
 * @param options - 기간 및 정렬 옵션 / period and sort options
 * @returns TanStack Query 결과 (LeaderboardEntry[]) / TanStack Query result (LeaderboardEntry[])
 */
export function useLeaderboard(options?: UseLeaderboardOptions) {
  // 기본값 설정: 전체 기간, 수익률 정렬 / Defaults: all periods, sort by return
  const period = options?.period ?? 'all';
  const sortBy = options?.sortBy ?? 'return';

  return useQuery<LeaderboardEntry[]>({
    // period, sortBy를 queryKey에 포함하여 옵션 변경 시 자동 리페치
    // Include period and sortBy in queryKey for automatic refetch on option change
    queryKey: ['leaderboard', period, sortBy],
    queryFn: async () => {
      // API-L-01: period와 sortBy를 쿼리 파라미터로 전달 — 백엔드에서 미지원 시 무시됨
      // API-L-01: Pass period and sortBy as query params — ignored if backend doesn't support them
      const { data } = await api.get('/api/portfolio/leaderboard', { params: { limit: 100, period, sortBy } });

      // 백엔드 응답 구조가 다양할 수 있으므로 data.data 또는 data 자체를 사용
      // Backend response structure may vary, so use data.data or data itself
      const raw: { rank: number; id?: string; userId?: string; isMe?: boolean; username?: string; name?: string; totalPortfolioValue?: number; totalValue?: number; pnlPercent?: number; hasTraded?: boolean }[] = data.data ?? data;

      // 백엔드 필드명 차이를 정규화 (id/userId, totalPortfolioValue/totalValue 등)
      // Normalize different backend field names (id/userId, totalPortfolioValue/totalValue, etc.)
      return raw.map((e) => ({
        rank: e.rank,
        id: e.id || e.userId || '',
        isMe: !!e.isMe,
        username: e.username || '',
        name: e.name || '',
        totalValue: Number(e.totalPortfolioValue || e.totalValue || 0),
        pnlPercent: Number(e.pnlPercent || 0),
        hasTraded: !!e.hasTraded,
      }));
    },
    // 10초마다 자동 리페치하여 순위 변동을 실시간에 가깝게 반영
    // Auto-refetch every 10s to reflect near-real-time ranking changes
    refetchInterval: 10000,
  });
}
