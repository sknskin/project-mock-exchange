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

export interface TradeHistory {
  tradeId: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerId: string;
  sellerId: string;
  symbol: string;
  price: number;
  quantity: number;
  total: number;
  executedAt: string;
}

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
      // 백엔드 DTO는 quantity/price를 decimal 문자열로, idempotencyKey를 필수로 요구
      const payload = {
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity.toString(),
        ...(order.price != null ? { price: order.price.toString() } : {}),
        idempotencyKey: crypto.randomUUID(),
      };
      const { data } = await api.post('/api/orders', payload);
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

export function useModifyOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, price, quantity }: { orderId: string; price?: number; quantity?: number }) => {
      // 백엔드 DTO는 price/quantity를 decimal 문자열로 요구
      const payload: Record<string, string> = {};
      if (price != null) payload.price = price.toString();
      if (quantity != null) payload.quantity = quantity.toString();
      const { data } = await api.patch(`/api/orders/${orderId}`, payload);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useTradeHistory() {
  return useQuery<TradeHistory[]>({
    queryKey: ['trades', 'history'],
    queryFn: async () => {
      const { data } = await api.get('/api/orders/trades/history');
      const raw: any[] = data.data ?? data;
      return raw.map((t: any) => ({
        tradeId: t.tradeId,
        buyOrderId: t.buyOrderId,
        sellOrderId: t.sellOrderId,
        buyerId: t.buyerId,
        sellerId: t.sellerId,
        symbol: t.symbol,
        price: Number(t.price),
        quantity: Number(t.quantity),
        total: Number(t.total),
        executedAt: t.executedAt,
      }));
    },
    refetchInterval: 10000,
  });
}
