/**
 * @file 팔로우 훅
 * @description TanStack Query로 트레이더 팔로우/언팔로우, 팔로우 상태, 카운트 조회를 처리합니다
 *
 * @file Follow Hooks
 * @description Handles trader follow/unfollow, follow status, and counts via TanStack Query
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { TraderFollow, FollowCounts } from '@/types';

/**
 * 현재 사용자가 팔로우 중인 트레이더 목록을 조회하는 훅
 * Hook that fetches the list of traders the current user is following
 *
 * @returns TanStack Query 결과 (TraderFollow[]) / TanStack Query result (TraderFollow[])
 */
export function useFollowing() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<TraderFollow[]>({
    queryKey: ['follow', 'following'],
    queryFn: async () => {
      const { data } = await api.get('/api/follow/following');
      // 응답이 { items: [...] } 형태일 수 있으므로 배열 추출
      // Response may be { items: [...] } so extract array
      const res = data.data ?? data;
      return Array.isArray(res) ? res : (res.items ?? []);
    },
    // 미인증 상태에서는 쿼리 비활성화 / Disable query when unauthenticated
    enabled: isAuthenticated,
  });
}

/**
 * 특정 사용자의 팔로워 목록을 조회하는 훅
 * Hook that fetches a specific user's followers list
 *
 * @param userId - 대상 사용자 ID / Target user ID
 * @returns TanStack Query 결과 (TraderFollow[]) / TanStack Query result (TraderFollow[])
 */
export function useFollowers(userId: string) {
  return useQuery<TraderFollow[]>({
    queryKey: ['follow', 'followers', userId],
    queryFn: async () => {
      const { data } = await api.get(`/api/follow/followers/${userId}`);
      // 응답이 { items: [...] } 형태일 수 있으므로 배열 추출
      // Response may be { items: [...] } so extract array
      const res = data.data ?? data;
      return Array.isArray(res) ? res : (res.items ?? []);
    },
    // userId가 없으면 쿼리 비활성화 / Disable query when userId is empty
    enabled: !!userId,
  });
}

/**
 * 현재 사용자가 특정 트레이더를 팔로우 중인지 확인하는 훅
 * Hook that checks if the current user is following a specific trader
 *
 * @param userId - 대상 트레이더 ID / Target trader ID
 * @returns { isFollowing: boolean } / TanStack Query result
 */
export function useFollowStatus(userId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<{ isFollowing: boolean }>({
    queryKey: ['follow', 'status', userId],
    queryFn: async () => {
      const { data } = await api.get(`/api/follow/status/${userId}`);
      return data.data ?? data;
    },
    // 미인증이거나 userId가 없으면 비활성화 / Disable when unauthenticated or no userId
    enabled: isAuthenticated && !!userId,
  });
}

/**
 * 특정 사용자의 팔로잉/팔로워 카운트를 조회하는 훅
 * Hook that fetches following/follower counts for a specific user
 *
 * @param userId - 대상 사용자 ID / Target user ID
 * @returns TanStack Query 결과 (FollowCounts) / TanStack Query result (FollowCounts)
 */
export function useFollowCounts(userId: string) {
  return useQuery<FollowCounts>({
    queryKey: ['follow', 'counts', userId],
    queryFn: async () => {
      const { data } = await api.get(`/api/follow/counts/${userId}`);
      return data.data ?? data;
    },
    // userId가 없으면 쿼리 비활성화 / Disable query when userId is empty
    enabled: !!userId,
  });
}

/**
 * 트레이더 팔로우 뮤테이션 훅
 * Mutation hook for following a trader
 *
 * @returns mutate 함수에 userId 전달 / Pass userId to mutate
 */
export function useFollowTrader() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post(`/api/follow/${userId}`);
      return data;
    },
    // 낙관적 업데이트: 즉시 팔로우 상태 반영 / Optimistic update: immediately reflect follow state
    onMutate: async (userId: string) => {
      // 진행 중인 쿼리를 취소하여 낙관적 업데이트와 충돌 방지
      // Cancel in-flight queries to prevent conflict with optimistic update
      await queryClient.cancelQueries({ queryKey: ['follow', 'status', userId] });
      await queryClient.cancelQueries({ queryKey: ['follow', 'following'] });

      // 이전 값 저장 (롤백용) / Save previous values (for rollback)
      const previousStatus = queryClient.getQueryData<{ isFollowing: boolean }>(['follow', 'status', userId]);
      const previousFollowing = queryClient.getQueryData<TraderFollow[]>(['follow', 'following']);

      // 캐시를 낙관적으로 업데이트 / Optimistically update the cache
      queryClient.setQueryData(['follow', 'status', userId], { isFollowing: true });
      if (previousFollowing) {
        queryClient.setQueryData<TraderFollow[]>(['follow', 'following'], [
          ...previousFollowing,
          { id: `optimistic-${userId}`, followerId: '', followeeId: userId, notifyMode: 'ALL', createdAt: new Date().toISOString() },
        ]);
      }

      return { previousStatus, previousFollowing };
    },
    onError: (_err, userId, context) => {
      // 에러 시 이전 캐시 복원 / Rollback cache on error
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(['follow', 'status', userId], context.previousStatus);
      }
      if (context?.previousFollowing !== undefined) {
        queryClient.setQueryData(['follow', 'following'], context.previousFollowing);
      }
    },
    onSuccess: (_data, userId) => {
      // 낙관적 업데이트의 임시 ID를 실제 서버 ID로 교체하기 위해 팔로잉 목록 강제 리페치
      // Force refetch following list to replace optimistic IDs with real server IDs
      queryClient.invalidateQueries({ queryKey: ['follow', 'following'] });
      queryClient.invalidateQueries({ queryKey: ['follow', 'status', userId] });
      queryClient.invalidateQueries({ queryKey: ['follow', 'counts'] });
      addToast(t('follow.followSuccess'), 'success');
    },
  });
}

/**
 * 트레이더 언팔로우 뮤테이션 훅
 * Mutation hook for unfollowing a trader
 *
 * @returns mutate 함수에 userId 전달 / Pass userId to mutate
 */
export function useUnfollowTrader() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.delete(`/api/follow/${userId}`);
      return data;
    },
    // 낙관적 업데이트: 즉시 언팔로우 상태 반영 / Optimistic update: immediately reflect unfollow state
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: ['follow', 'status', userId] });
      await queryClient.cancelQueries({ queryKey: ['follow', 'following'] });

      const previousStatus = queryClient.getQueryData<{ isFollowing: boolean }>(['follow', 'status', userId]);
      const previousFollowing = queryClient.getQueryData<TraderFollow[]>(['follow', 'following']);

      queryClient.setQueryData(['follow', 'status', userId], { isFollowing: false });
      if (previousFollowing) {
        queryClient.setQueryData<TraderFollow[]>(
          ['follow', 'following'],
          previousFollowing.filter((f) => f.followeeId !== userId),
        );
      }

      return { previousStatus, previousFollowing };
    },
    onError: (_err, userId, context) => {
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(['follow', 'status', userId], context.previousStatus);
      }
      if (context?.previousFollowing !== undefined) {
        queryClient.setQueryData(['follow', 'following'], context.previousFollowing);
      }
    },
    onSuccess: (_data, userId) => {
      // 팔로우 관련 모든 캐시 무효화 / Invalidate all follow-related caches
      queryClient.invalidateQueries({ queryKey: ['follow'] });
      queryClient.invalidateQueries({ queryKey: ['follow', 'status', userId] });
      queryClient.invalidateQueries({ queryKey: ['follow', 'counts'] });
      addToast(t('follow.unfollowSuccess'), 'success');
    },
  });
}

/**
 * 여러 사용자의 팔로워 수를 한번에 조회하는 훅
 * Hook that fetches follower counts for multiple users in a single batch request
 *
 * @param userIds - 대상 사용자 ID 배열 / Array of target user IDs
 * @returns Record<userId, followerCount> / TanStack Query result
 */
export function useBatchFollowCounts(userIds: string[]) {
  return useQuery<Record<string, number>>({
    queryKey: ['follow', 'batch-counts', userIds.sort().join(',')],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data } = await api.post('/api/follow/batch-counts', { userIds });
      return data.data ?? data;
    },
    // userIds가 비어있으면 쿼리 비활성화 / Disable query when userIds is empty
    enabled: userIds.length > 0,
  });
}

/**
 * 팔로우 알림 모드 변경 뮤테이션 훅
 * Mutation hook for updating follow notification mode
 *
 * @returns mutate 함수에 { userId, notifyMode } 전달 / Pass { userId, notifyMode } to mutate
 */
export function useUpdateNotifyMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, notifyMode }: { userId: string; notifyMode: string }) => {
      const { data } = await api.put(`/api/follow/${userId}/notify-mode`, { notifyMode });
      return data;
    },
    onSuccess: () => {
      // 팔로잉 목록 캐시 갱신 / Refresh following list cache
      queryClient.invalidateQueries({ queryKey: ['follow', 'following'] });
    },
  });
}
