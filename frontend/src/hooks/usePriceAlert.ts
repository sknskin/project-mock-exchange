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

export function usePriceAlerts(symbol?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<PriceAlert[]>({
    queryKey: ['price-alerts', symbol],
    queryFn: async () => {
      const params = symbol ? `?symbol=${symbol}` : '';
      const { data } = await api.get(`/api/price-alerts${params}`);
      return data.data?.items ?? [];
    },
    enabled: isAuthenticated,
  });
}

export function useCreatePriceAlert() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (payload: { symbol: string; targetPrice: number; condition: 'ABOVE' | 'BELOW'; currency?: string; displayTargetPrice?: number }) => {
      const { data } = await api.post('/api/price-alerts', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
      useToastStore.getState().addToast(t('toast.alertCreated'), 'success');
    },
  });
}

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
