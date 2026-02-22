/**
 * @file 관심종목 훅
 * @description 관심종목 조회/추가/삭제를 위한 TanStack Query 훅
 *
 * @file Watchlist Hooks
 * @description TanStack Query hooks for watchlist retrieval, addition, and removal
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useTranslation } from '@/hooks/useTranslation';

export function useWatchlist() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<string[]>({
    queryKey: ['portfolio', 'watchlist'],
    queryFn: async () => {
      const { data } = await api.get('/api/portfolio/watchlist');
      return data.data ?? data;
    },
    enabled: isAuthenticated,
  });
}

export function useAddWatchlist() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (symbol: string) => {
      const { data } = await api.post(`/api/portfolio/watchlist/${symbol}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'watchlist'] });
      useToastStore.getState().addToast(t('toast.watchlistAdded'));
    },
  });
}

export function useRemoveWatchlist() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (symbol: string) => {
      const { data } = await api.delete(`/api/portfolio/watchlist/${symbol}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'watchlist'] });
      useToastStore.getState().addToast(t('toast.watchlistRemoved'));
    },
  });
}
