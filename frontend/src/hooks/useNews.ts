/**
 * @file 뉴스 데이터 훅
 * @description 뉴스 목록 조회, 스크래핑 상태 확인, 스크래핑 트리거를 위한 TanStack Query 훅
 *
 * @file News Data Hooks
 * @description TanStack Query hooks for news list, scrape status, and scrape trigger
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { NewsItem, PaginatedResponse, ScrapeStatus } from '@/types';

/**
 * 뉴스 목록을 카테고리별 페이지네이션으로 조회하는 훅 (서버 사이드 검색/날짜 필터 지원)
 * Hook that fetches paginated news list by category (supports server-side keyword search and date filter)
 *
 * @param params.category - 뉴스 카테고리 / News category
 * @param params.page - 페이지 번호 / Page number
 * @param params.limit - 페이지당 항목 수 / Items per page
 * @param params.keyword - 검색어 (선택) / Search keyword (optional)
 * @param params.dateFilter - 날짜 필터 (선택: all, 24h, 7d, 30d) / Date filter (optional: all, 24h, 7d, 30d)
 * @returns TanStack Query 결과 (PaginatedResponse<NewsItem>) / TanStack Query result
 */
export function useNews(params: {
  category: string;
  page: number;
  limit: number;
  keyword?: string;
  dateFilter?: string;
}) {
  return useQuery({
    queryKey: ['news', params],
    queryFn: async () => {
      // 빈 검색어와 'all' 날짜 필터는 전송하지 않음 / Omit empty keyword and 'all' dateFilter
      const queryParams: Record<string, string | number> = {
        category: params.category,
        page: params.page,
        limit: params.limit,
      };
      if (params.keyword && params.keyword.trim()) {
        queryParams.keyword = params.keyword.trim();
      }
      if (params.dateFilter && params.dateFilter !== 'all') {
        queryParams.dateFilter = params.dateFilter;
      }
      const { data } = await api.get('/api/news', { params: queryParams });
      return data.data as PaginatedResponse<NewsItem>;
    },
    // 60초마다 자동 리페치 / Auto-refetch every 60 seconds
    refetchInterval: 60_000,
  });
}

/**
 * 뉴스 스크래핑 상태를 조회하는 훅 (각 카테고리별 마지막 스크래핑 시간 등)
 * Hook that fetches news scrape status (last scrape time per category, etc.)
 *
 * @returns TanStack Query 결과 (ScrapeStatus[]) / TanStack Query result (ScrapeStatus[])
 */
export function useScrapeStatus() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['news-scrape-status'],
    queryFn: async () => {
      const { data } = await api.get('/api/news/scrape-status');
      return data.data as ScrapeStatus[];
    },
    // 5분마다 자동 리페치 / Auto-refetch every 5 minutes
    refetchInterval: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });
}

/**
 * 뉴스 스크래핑 트리거 뮤테이션 훅 (관리자 수동 스크래핑)
 * Mutation hook for triggering news scraping (admin manual scrape)
 *
 * @returns mutate 함수에 카테고리 문자열 전달 / Pass category string to mutate
 */
export function useTriggerScrape() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: string) => {
      const { data } = await api.post(`/api/news/scrape?category=${category}`);
      return data;
    },
    onSuccess: () => {
      // 뉴스 목록과 스크래핑 상태 모두 갱신 / Refresh both news list and scrape status
      queryClient.invalidateQueries({ queryKey: ['news'] });
      queryClient.invalidateQueries({ queryKey: ['news-scrape-status'] });
    },
  });
}
