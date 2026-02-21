'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { NewsItem, PaginatedResponse, ScrapeStatus } from '@/types';

export function useNews(params: {
  category: string;
  page: number;
  limit: number;
}) {
  return useQuery({
    queryKey: ['news', params],
    queryFn: async () => {
      const { data } = await api.get('/api/news', { params });
      return data.data as PaginatedResponse<NewsItem>;
    },
  });
}

export function useScrapeStatus() {
  return useQuery({
    queryKey: ['news-scrape-status'],
    queryFn: async () => {
      const { data } = await api.get('/api/news/scrape-status');
      return data.data as ScrapeStatus[];
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useTriggerScrape() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: string) => {
      const { data } = await api.post(`/api/news/scrape?category=${category}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      queryClient.invalidateQueries({ queryKey: ['news-scrape-status'] });
    },
  });
}
