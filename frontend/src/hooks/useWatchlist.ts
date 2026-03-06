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

/**
 * 현재 사용자의 관심종목(심볼) 목록을 조회하는 훅
 * 인증된 사용자만 조회 가능합니다.
 *
 * Hook that fetches the current user's watchlist (symbol list).
 * Only available for authenticated users.
 *
 * @returns TanStack Query 결과 (string[] — 심볼 배열) / TanStack Query result (string[] — symbol array)
 */
export function useWatchlist() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<string[]>({
    queryKey: ['portfolio', 'watchlist'],
    queryFn: async () => {
      const { data } = await api.get('/api/portfolio/watchlist');
      return data.data ?? data;
    },
    // 미인증 상태에서는 쿼리 비활성화 / Disable query when unauthenticated
    enabled: isAuthenticated,
  });
}

/**
 * 관심종목 추가 뮤테이션 훅
 * Mutation hook for adding a symbol to the watchlist
 *
 * @returns mutate 함수에 심볼 문자열 전달 / Pass symbol string to mutate
 */
export function useAddWatchlist() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (symbol: string) => {
      const { data } = await api.post(`/api/portfolio/watchlist/${symbol}`);
      return data;
    },
    onMutate: async (symbol: string) => {
      await queryClient.cancelQueries({ queryKey: ['portfolio', 'watchlist'] });
      const previous = queryClient.getQueryData<string[]>(['portfolio', 'watchlist']);
      queryClient.setQueryData<string[]>(['portfolio', 'watchlist'], (old) => [...(old ?? []), symbol]);
      return { previous };
    },
    onError: (_err, _symbol, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['portfolio', 'watchlist'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'watchlist'] });
    },
    onSuccess: () => {
      useToastStore.getState().addToast(t('toast.watchlistAdded'), 'success');
    },
  });
}

/**
 * 관심종목 삭제 뮤테이션 훅
 * Mutation hook for removing a symbol from the watchlist
 *
 * @returns mutate 함수에 심볼 문자열 전달 / Pass symbol string to mutate
 */
export function useRemoveWatchlist() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (symbol: string) => {
      const { data } = await api.delete(`/api/portfolio/watchlist/${symbol}`);
      return data;
    },
    onMutate: async (symbol: string) => {
      await queryClient.cancelQueries({ queryKey: ['portfolio', 'watchlist'] });
      const previous = queryClient.getQueryData<string[]>(['portfolio', 'watchlist']);
      queryClient.setQueryData<string[]>(['portfolio', 'watchlist'], (old) => (old ?? []).filter((s) => s !== symbol));
      return { previous };
    },
    onError: (_err, _symbol, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['portfolio', 'watchlist'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'watchlist'] });
    },
    onSuccess: () => {
      useToastStore.getState().addToast(t('toast.watchlistRemoved'), 'success');
    },
  });
}
