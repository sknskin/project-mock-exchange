/**
 * @file 카피 트레이딩 훅
 * @description TanStack Query로 카피 트레이딩 설정 CRUD, 시작/중지, 실행 내역을 처리합니다
 *
 * @file Copy Trading Hooks
 * @description Handles copy trading config CRUD, start/stop, and execution history via TanStack Query
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { CopyTradeConfig, CopyTradeExecution } from '@/types';

// 카피 트레이딩 내역 페이지네이션 응답 / Copy trade history paginated response
interface CopyTradeHistoryResponse {
  data: CopyTradeExecution[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 현재 사용자의 모든 카피 트레이딩 설정을 조회하는 훅
 * Hook that fetches all copy trading configurations for the current user
 *
 * @returns TanStack Query 결과 (CopyTradeConfig[]) / TanStack Query result (CopyTradeConfig[])
 */
export function useCopyTradeStatus() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<CopyTradeConfig[]>({
    queryKey: ['copyTrade', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/api/copy-trade/status');
      return data.data ?? data;
    },
    // 미인증 상태에서는 쿼리 비활성화 / Disable query when unauthenticated
    enabled: isAuthenticated,
  });
}

/**
 * 특정 트레이더에 대한 카피 트레이딩 설정을 조회하는 훅
 * Hook that fetches copy trading configuration for a specific trader
 *
 * @param traderId - 대상 트레이더 ID / Target trader ID
 * @returns TanStack Query 결과 (CopyTradeConfig | null) / TanStack Query result (CopyTradeConfig | null)
 */
export function useCopyTradeConfig(traderId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<CopyTradeConfig | null>({
    queryKey: ['copyTrade', 'config', traderId],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/api/copy-trade/status/${traderId}`);
        return data.data ?? data ?? null;
      } catch {
        // 설정이 없으면 null 반환 / Return null if no config exists
        return null;
      }
    },
    // 미인증이거나 traderId가 없으면 비활성화 / Disable when unauthenticated or no traderId
    enabled: isAuthenticated && !!traderId,
  });
}

/**
 * 카피 트레이딩 시작 뮤테이션 훅
 * Mutation hook for starting copy trading
 *
 * @returns mutate 함수에 { traderId, scaleRatio, maxInvestment, stopLossPercent? } 전달
 *          Pass { traderId, scaleRatio, maxInvestment, stopLossPercent? } to mutate
 */
export function useStartCopyTrade() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (body: {
      traderId: string;
      scaleRatio: number;
      maxInvestment: number;
      stopLossPercent?: number;
    }) => {
      const { data } = await api.post('/api/copy-trade/start', body);
      return data;
    },
    onSuccess: (_data, vars) => {
      // 카피 트레이딩 관련 모든 캐시 무효화 / Invalidate all copy trade caches
      queryClient.invalidateQueries({ queryKey: ['copyTrade'] });
      queryClient.invalidateQueries({ queryKey: ['copyTrade', 'config', vars.traderId] });
      addToast(t('copyTrade.startSuccess'), 'success');
    },
  });
}

/**
 * 카피 트레이딩 설정 변경 뮤테이션 훅
 * Mutation hook for updating copy trading configuration
 *
 * @returns mutate 함수에 { traderId, scaleRatio?, maxInvestment?, stopLossPercent? } 전달
 *          Pass { traderId, scaleRatio?, maxInvestment?, stopLossPercent? } to mutate
 */
export function useUpdateCopyTrade() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ traderId, ...body }: {
      traderId: string;
      scaleRatio?: number;
      maxInvestment?: number;
      stopLossPercent?: number;
    }) => {
      const { data } = await api.put(`/api/copy-trade/config/${traderId}`, body);
      return data;
    },
    onSuccess: (_data, vars) => {
      // 카피 트레이딩 관련 모든 캐시 무효화 / Invalidate all copy trade caches
      queryClient.invalidateQueries({ queryKey: ['copyTrade'] });
      queryClient.invalidateQueries({ queryKey: ['copyTrade', 'config', vars.traderId] });
      addToast(t('copyTrade.updateSuccess'), 'success');
    },
  });
}

/**
 * 카피 트레이딩 중지 뮤테이션 훅
 * Mutation hook for stopping copy trading
 *
 * @returns mutate 함수에 traderId 전달 / Pass traderId to mutate
 */
export function useStopCopyTrade() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (traderId: string) => {
      const { data } = await api.post(`/api/copy-trade/stop/${traderId}`);
      return data;
    },
    onSuccess: (_data, traderId) => {
      // 카피 트레이딩 관련 모든 캐시 무효화 / Invalidate all copy trade caches
      queryClient.invalidateQueries({ queryKey: ['copyTrade'] });
      queryClient.invalidateQueries({ queryKey: ['copyTrade', 'config', traderId] });
      addToast(t('copyTrade.stopSuccess'), 'success');
    },
  });
}

/**
 * 카피 트레이딩 실행 내역을 페이지네이션으로 조회하는 훅
 * Hook that fetches paginated copy trading execution history
 *
 * @param page - 페이지 번호 (기본: 1) / Page number (default: 1)
 * @returns TanStack Query 결과 (CopyTradeHistoryResponse) / TanStack Query result (CopyTradeHistoryResponse)
 */
export function useCopyTradeHistory(page = 1) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<CopyTradeHistoryResponse>({
    queryKey: ['copyTrade', 'history', page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get(`/api/copy-trade/history?${params.toString()}`);

      // 백엔드 응답 구조 정규화 / Normalize backend response structure
      const res = data.data ?? data;
      return {
        data: res.executions ?? res.data ?? [],
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
