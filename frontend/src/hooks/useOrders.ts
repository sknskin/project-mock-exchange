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
      const raw: Record<string, unknown>[] = data.data ?? data;
      return raw.map((o) => ({
        id: (o.orderId as string) ?? '',
        userId: (o.userId as string) ?? '',
        symbol: (o.symbol as string) ?? '',
        side: (o.side as Order['side']) ?? 'BUY',
        type: (o.orderType === 'MARKET' ? 'MARKET' : 'LIMIT') as Order['type'],
        status: (o.status as Order['status']) ?? 'PENDING',
        quantity: Number(o.quantity) || 0,
        price: o.price != null ? Number(o.price) : null,
        filledQuantity: Number(o.filledQuantity) || 0,
        filledPrice: o.price != null ? Number(o.price) : null,
        triggerPrice: o.triggerPrice != null ? Number(o.triggerPrice) : null,
        triggerType: (o.triggerType as Order['triggerType']) ?? null,
        triggered: Boolean(o.triggered),
        createdAt: String(o.createdAt ?? ''),
        updatedAt: String(o.updatedAt ?? ''),
      }));
    },
    refetchInterval: 5000,
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: PlaceOrderRequest) => {
      // 백엔드 DTO는 quantity/price를 decimal 문자열로, idempotencyKey를 필수로 요구
      const payload: Record<string, string> = {
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity.toString(),
        idempotencyKey: crypto.randomUUID(),
      };
      if (order.price != null) payload.price = order.price.toString();
      if (order.triggerPrice != null) payload.triggerPrice = order.triggerPrice.toString();
      if (order.triggerType) payload.triggerType = order.triggerType;
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
      const raw: Record<string, unknown>[] = data.data ?? data;
      return raw.map((t) => ({
        tradeId: t.tradeId as string,
        buyOrderId: t.buyOrderId as string,
        sellOrderId: t.sellOrderId as string,
        buyerId: t.buyerId as string,
        sellerId: t.sellerId as string,
        symbol: t.symbol as string,
        price: Number(t.price) || 0,
        quantity: Number(t.quantity) || 0,
        total: Number(t.total) || 0,
        executedAt: String(t.executedAt ?? ''),
      }));
    },
    refetchInterval: 10000,
  });
}
