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

/** 체결 내역 인터페이스
 * Trade history record interface */
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

// ===== 주문 조회 (Order Query) =====

/**
 * 현재 사용자의 주문 목록을 조회하는 훅
 * 백엔드 응답의 필드명(orderId, orderType 등)을 프론트엔드 Order 타입으로 정규화합니다.
 *
 * Hook that fetches the current user's order list.
 * Normalizes backend field names (orderId, orderType, etc.) to frontend Order type.
 *
 * @param status - 주문 상태 필터 (선택: 'PENDING', 'FILLED' 등) / Order status filter (optional: 'PENDING', 'FILLED', etc.)
 * @returns TanStack Query 결과 (Order[]) / TanStack Query result (Order[])
 */
export function useOrders(status?: string) {
  return useQuery<Order[]>({
    queryKey: ['orders', status],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      const { data } = await api.get('/api/orders', { params });
      const raw: Record<string, unknown>[] = data.data ?? data;

      // 백엔드 ↔ 프론트엔드 필드 매핑 (orderId→id, orderType→type 등)
      // Backend ↔ Frontend field mapping (orderId→id, orderType→type, etc.)
      return raw.map((o) => ({
        id: (o.orderId as string) ?? '',
        userId: (o.userId as string) ?? '',
        symbol: (o.symbol as string) ?? '',
        side: (o.side as Order['side']) ?? 'BUY',
        type: (o.orderType === 'MARKET' ? 'MARKET' : 'LIMIT') as Order['type'],
        status: (o.status as Order['status']) ?? 'PENDING',
        quantity: Number.isFinite(Number(o.quantity)) ? Number(o.quantity) : 0,
        price: o.price != null ? Number(o.price) : null,
        filledQuantity: Number.isFinite(Number(o.filledQuantity)) ? Number(o.filledQuantity) : 0,
        filledPrice: o.price != null ? Number(o.price) : null,
        // 조건부 주문 관련 필드 / Conditional order related fields
        triggerPrice: o.triggerPrice != null ? Number(o.triggerPrice) : null,
        triggerType: (o.triggerType as Order['triggerType']) ?? null,
        triggered: Boolean(o.triggered),
        createdAt: String(o.createdAt ?? ''),
        updatedAt: String(o.updatedAt ?? ''),
      }));
    },
    // 주문 상태 변경을 반영하기 위해 10초 간격 폴링
    // Poll every 10 seconds to reflect order status changes
    refetchInterval: 10000,
    // FC-M-02: 폴링 주기 내 중복 리페치 방지 (8초간 fresh 유지)
    // FC-M-02: Avoid redundant refetches within the polling cycle (stay fresh for 8s)
    staleTime: 8000,
  });
}

// ===== 주문 뮤테이션 훅 (Order Mutation Hooks) =====

/**
 * 주문 실행(주문 넣기) 뮤테이션 훅
 * 프론트엔드의 number 타입을 백엔드가 요구하는 decimal 문자열로 변환합니다.
 * 중복 주문 방지를 위해 crypto.randomUUID()로 멱등성 키를 생성합니다.
 *
 * Mutation hook for placing an order.
 * Converts frontend number types to decimal strings required by the backend DTO.
 * Generates an idempotency key via crypto.randomUUID() to prevent duplicate orders.
 *
 * @returns mutate 함수에 PlaceOrderRequest 전달 / Pass PlaceOrderRequest to mutate
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: PlaceOrderRequest) => {
      // 백엔드 DTO는 quantity/price를 decimal 문자열로, idempotencyKey를 필수로 요구
      // Backend DTO requires quantity/price as decimal strings, idempotencyKey as mandatory
      const payload: Record<string, string> = {
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity.toString(),
        // UUID v4로 멱등성 키 생성 — 네트워크 재시도 시 중복 주문 방지
        // Generate idempotency key with UUID v4 — prevents duplicate orders on network retry
        idempotencyKey: crypto.randomUUID(),
      };
      // LIMIT 주문에만 price 포함 / Include price only for LIMIT orders
      if (order.price != null) payload.price = order.price.toString();
      // 조건부 주문(Stop-Loss/Take-Profit) 필드 / Conditional order fields (Stop-Loss/Take-Profit)
      if (order.triggerPrice != null) payload.triggerPrice = order.triggerPrice.toString();
      if (order.triggerType) payload.triggerType = order.triggerType;
      const { data } = await api.post('/api/orders', payload);
      return data.data ?? data;
    },
    onSuccess: () => {
      // 주문 목록과 포트폴리오(잔고) 캐시를 함께 갱신
      // Invalidate both orders list and portfolio (balance) cache
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

/**
 * 주문 취소 뮤테이션 훅
 * Mutation hook for cancelling an order
 *
 * @returns mutate 함수에 주문 ID 전달 / Pass order ID to mutate
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await api.delete(`/api/orders/${orderId}`);
      return data.data ?? data;
    },
    onSuccess: () => {
      // 취소 시 잔고가 복원되므로 포트폴리오도 갱신
      // Portfolio also needs refresh since balance is restored on cancel
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

/**
 * 주문 수정(가격/수량 변경) 뮤테이션 훅
 * Mutation hook for modifying an order (price/quantity change)
 *
 * @returns mutate 함수에 { orderId, price?, quantity? } 전달 / Pass { orderId, price?, quantity? } to mutate
 */
export function useModifyOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, price, quantity }: { orderId: string; price?: number; quantity?: number }) => {
      // 백엔드 DTO는 price/quantity를 decimal 문자열로 요구
      // Backend DTO requires price/quantity as decimal strings
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

// ===== 체결 내역 조회 (Trade History Query) =====

/**
 * 현재 사용자의 체결 내역을 조회하는 훅
 * Hook that fetches the current user's trade execution history
 *
 * @returns TanStack Query 결과 (TradeHistory[]) / TanStack Query result (TradeHistory[])
 */
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
    // 10초마다 리페치하여 새 체결 반영 / Refetch every 10s to reflect new trades
    refetchInterval: 10000,
    // FC-M-02: 폴링 주기 내 중복 리페치 방지 (8초간 fresh 유지)
    // FC-M-02: Avoid redundant refetches within the polling cycle (stay fresh for 8s)
    staleTime: 8000,
  });
}
