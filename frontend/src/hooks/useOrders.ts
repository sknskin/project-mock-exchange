/**
 * @file 주문 훅
 * @description TanStack Query로 주문 목록, 체결 내역을 조회하고 주문을 실행합니다
 *
 * @file Orders Hook
 * @description Fetches orders, trade history, and executes orders via TanStack Query
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Order, PlaceOrderRequest } from '@/types';

export function useOrders(status?: string) {
  return useQuery<Order[]>({
    queryKey: ['orders', status],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      const { data } = await api.get('/api/orders', { params });
      return data.data ?? data;
    },
    refetchInterval: 5000,
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: PlaceOrderRequest) => {
      const { data } = await api.post('/api/orders', order);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await api.delete(`/api/orders/${orderId}`);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}
