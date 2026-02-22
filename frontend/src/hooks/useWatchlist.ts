import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

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

  return useMutation({
    mutationFn: async (symbol: string) => {
      const { data } = await api.post(`/api/portfolio/watchlist/${symbol}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'watchlist'] });
    },
  });
}

export function useRemoveWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (symbol: string) => {
      const { data } = await api.delete(`/api/portfolio/watchlist/${symbol}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'watchlist'] });
    },
  });
}
