/**
 * @file 가격 알림 훅
 * @description 가격 알림 조회/생성/삭제를 위한 TanStack Query 훅
 *
 * @file Price Alert Hooks
 * @description TanStack Query hooks for price alert CRUD operations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { PriceAlert } from '@/types';

/**
 * 가격 알림 목록을 조회하는 훅 (선택적 심볼 필터)
 * Hook that fetches price alerts list (with optional symbol filter)
 *
 * @param symbol - 특정 종목 필터 (선택) / Specific symbol filter (optional)
 * @returns TanStack Query 결과 (PriceAlert[]) / TanStack Query result (PriceAlert[])
 */
export function usePriceAlerts(symbol?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<PriceAlert[]>({
    queryKey: ['price-alerts', symbol],
    queryFn: async () => {
      const params = symbol ? `?symbol=${symbol}` : '';
      const { data } = await api.get(`/api/price-alerts${params}`);
      return data.data?.items ?? [];
    },
    // 미인증 상태에서는 쿼리 비활성화 / Disable query when unauthenticated
    enabled: isAuthenticated,
  });
}

/**
 * 가격 알림 생성 뮤테이션 훅
 * Mutation hook for creating a price alert
 *
 * @returns mutate 함수에 { symbol, targetPrice, condition, currency?, displayTargetPrice? } 전달
 *          Pass { symbol, targetPrice, condition, currency?, displayTargetPrice? } to mutate
 */
export function useCreatePriceAlert() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (payload: {
      symbol: string;
      targetPrice: number;
      /** 'ABOVE' = 목표가 이상일 때, 'BELOW' = 목표가 이하일 때 알림 / 'ABOVE' = alert when above target, 'BELOW' = when below */
      condition: 'ABOVE' | 'BELOW';
      /** 통화 단위 (KRW/USD 등) / Currency unit (KRW/USD, etc.) */
      currency?: string;
      /** UI 표시용 목표가 (환율 변환된 값) / Target price for UI display (exchange-rate-converted value) */
      displayTargetPrice?: number;
    }) => {
      const { data } = await api.post('/api/price-alerts', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
      useToastStore.getState().addToast(t('toast.alertCreated'), 'success');
    },
  });
}

/**
 * 가격 알림 삭제 뮤테이션 훅
 * Mutation hook for deleting a price alert
 *
 * @returns mutate 함수에 알림 ID 전달 / Pass alert ID to mutate
 */
export function useDeletePriceAlert() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/price-alerts/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
      useToastStore.getState().addToast(t('toast.alertDeleted'), 'success');
    },
  });
}
