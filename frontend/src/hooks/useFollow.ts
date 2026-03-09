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
    onSuccess: (_data, userId) => {
      // 팔로우 관련 모든 캐시 무효화 / Invalidate all follow-related caches
      queryClient.invalidateQueries({ queryKey: ['follow'] });
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
