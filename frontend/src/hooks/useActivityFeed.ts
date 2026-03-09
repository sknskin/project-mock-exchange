/**
 * @file 활동 피드 훅
 * @description TanStack Query로 팔로우 중인 트레이더의 거래 활동과 개별 트레이더 활동을 조회합니다
 *
 * @file Activity Feed Hooks
 * @description Fetches followed traders' trade activities and individual trader activities via TanStack Query
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { TraderActivity } from '@/types';

// 활동 피드 페이지네이션 응답 / Activity feed paginated response
interface ActivityFeedResponse {
  data: TraderActivity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 팔로우 중인 트레이더들의 활동 피드를 페이지네이션으로 조회하는 훅
 * Hook that fetches paginated activity feed from followed traders
 *
 * @param page - 페이지 번호 (기본: 1) / Page number (default: 1)
 * @returns TanStack Query 결과 (ActivityFeedResponse) / TanStack Query result (ActivityFeedResponse)
 */
export function useActivityFeed(page = 1) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<ActivityFeedResponse>({
    // page를 queryKey에 포함하여 페이지 변경 시 자동 리페치
    // Include page in queryKey for automatic refetch on page change
    queryKey: ['activity', 'feed', page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get(`/api/portfolio/feed?${params.toString()}`);

      // 백엔드 응답 구조 정규화 / Normalize backend response structure
      const res = data.data ?? data;
      return {
        data: res.activities ?? res.data ?? [],
        total: res.total ?? 0,
        page: res.page ?? page,
        limit: res.limit ?? 20,
        totalPages: res.totalPages ?? 1,
      };
    },
    // 미인증 상태에서는 쿼리 비활성화 / Disable query when unauthenticated
    enabled: isAuthenticated,
    // 30초마다 자동 리페치 / Auto-refetch every 30s
    refetchInterval: 30000,
  });
}

/**
 * 특정 트레이더의 거래 활동을 페이지네이션으로 조회하는 훅
 * Hook that fetches paginated trade activities for a specific trader
 *
 * @param userId - 트레이더 ID / Trader ID
 * @param page - 페이지 번호 (기본: 1) / Page number (default: 1)
 * @returns TanStack Query 결과 (ActivityFeedResponse) / TanStack Query result (ActivityFeedResponse)
 */
export function useTraderActivities(userId: string, page = 1) {
  return useQuery<ActivityFeedResponse>({
    // userId와 page를 queryKey에 포함 / Include userId and page in queryKey
    queryKey: ['activity', 'trader', userId, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get(`/api/portfolio/activities/${userId}?${params.toString()}`);

      // 백엔드 응답 구조 정규화 / Normalize backend response structure
      const res = data.data ?? data;
      return {
        data: res.activities ?? res.data ?? [],
        total: res.total ?? 0,
        page: res.page ?? page,
        limit: res.limit ?? 20,
        totalPages: res.totalPages ?? 1,
      };
    },
    // userId가 없으면 쿼리 비활성화 / Disable query when userId is empty
    enabled: !!userId,
  });
}
