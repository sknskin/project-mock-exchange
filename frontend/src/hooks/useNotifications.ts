/**
 * @file 알림 훅 (Pro 기능용)
 * @description 팔로우/카피 트레이딩 관련 알림 조회, 읽음 처리를 위한 TanStack Query 훅
 *              기존 useAdmin의 알림 훅을 재수출하며, 추가적인 Pro 전용 편의 훅을 제공합니다
 *
 * @file Notification Hooks (for Pro features)
 * @description TanStack Query hooks for follow/copy-trade notifications
 *              Re-exports existing notification hooks from useAdmin, plus Pro-specific convenience hooks
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { AppNotification } from '@/types';

// 알림 목록 페이지네이션 응답 / Notification list paginated response
interface NotificationsResponse {
  data: AppNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 알림 목록을 페이지네이션으로 조회하는 훅
 * Hook that fetches paginated notifications list
 *
 * @param page - 페이지 번호 (기본: 1) / Page number (default: 1)
 * @returns TanStack Query 결과 (NotificationsResponse) / TanStack Query result (NotificationsResponse)
 */
export function useNotifications(page = 1) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get(`/api/notifications?${params.toString()}`);

      // 백엔드 응답 구조 정규화 / Normalize backend response structure
      const res = data.data ?? data;
      return {
        data: res.items ?? res.data ?? [],
        total: res.total ?? 0,
        page: res.page ?? page,
        limit: res.limit ?? 20,
        totalPages: res.totalPages ?? 1,
      };
    },
    // 미인증 상태에서는 쿼리 비활성화 / Disable query when unauthenticated
    enabled: isAuthenticated,
  });
}

/**
 * 읽지 않은 알림 수를 조회하는 훅
 * Hook that fetches the unread notification count
 *
 * @returns TanStack Query 결과 (number) / TanStack Query result (number)
 */
export function useUnreadCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/api/notifications/unread-count');
      return data.data?.count ?? data.count ?? data.data ?? 0;
    },
    // 미인증 상태에서는 쿼리 비활성화 / Disable query when unauthenticated
    enabled: isAuthenticated,
    // 30초마다 자동 리페치 / Auto-refetch every 30s
    refetchInterval: 30000,
  });
}

/**
 * 단일 알림 읽음 처리 뮤테이션 훅
 * Mutation hook for marking a single notification as read
 *
 * @returns mutate 함수에 알림 ID 전달 / Pass notification ID to mutate
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await api.put(`/api/notifications/${notificationId}/read`);
      return data;
    },
    onSuccess: () => {
      // 알림 목록과 읽지 않은 수 캐시 무효화 / Invalidate notifications list and unread count caches
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}

/**
 * 모든 알림 읽음 처리 뮤테이션 훅
 * Mutation hook for marking all notifications as read
 *
 * @returns mutate 호출 시 모든 알림 읽음 처리 / Marks all notifications as read on mutate
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.put('/api/notifications/read-all');
      return data;
    },
    onSuccess: () => {
      // 알림 목록과 읽지 않은 수 캐시 무효화 / Invalidate notifications list and unread count caches
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}
