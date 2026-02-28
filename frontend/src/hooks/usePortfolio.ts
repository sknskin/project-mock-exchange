/**
 * @file 포트폴리오 훅
 * @description TanStack Query로 잔고, 보유 자산, 거래 내역을 조회합니다
 *
 * @file Portfolio Hook
 * @description Fetches balance, holdings, and transactions via TanStack Query
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Portfolio } from '@/types';

// API 응답에서 실제 데이터 추출 (Unwrap { success, data } wrapper with null guard)
function unwrapResponse<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as Record<string, unknown>).data as T;
  }
  return data as T;
}

export function usePortfolio() {
  return useQuery<Portfolio>({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const { data } = await api.get('/api/portfolio/summary');
      return unwrapResponse<Portfolio>(data);
    },
    refetchInterval: 10000,
  });
}

export function usePortfolioValuation() {
  return useQuery<Portfolio>({
    queryKey: ['portfolio', 'valuation'],
    queryFn: async () => {
      const { data } = await api.get('/api/portfolio/valuation');
      return unwrapResponse<Portfolio>(data);
    },
    refetchInterval: 10000,
  });
}

export function useDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await api.post('/api/portfolio/deposit', { amount });
      return unwrapResponse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await api.post('/api/portfolio/withdraw', { amount });
      return unwrapResponse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}
