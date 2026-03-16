/**
 * @file 전략 공유 데이터 훅
 * @description TanStack Query로 전략 CRUD, 좋아요, 댓글을 처리합니다
 *
 * @file Strategy Sharing Data Hook
 * @description Handles strategy CRUD, likes, and comments via TanStack Query
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { CommunityStrategy, StrategyComment } from '@/types';

// ===== 타입 정의 (Type Definitions) =====

/** 전략 목록 페이지네이션 응답
 * Paginated strategies list response */
interface StrategiesResponse {
  data: CommunityStrategy[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** 전략 상세 응답 (댓글 포함)
 * Strategy detail response (including comments) */
interface StrategyDetail extends CommunityStrategy {
  comments: StrategyComment[];
}

// ===== 조회 훅 (Query Hooks) =====

/**
 * 전략 목록을 페이지네이션으로 조회하는 훅
 * Hook that fetches paginated strategies list
 *
 * @param page - 페이지 번호 (기본: 1) / Page number (default: 1)
 * @param symbol - 종목 필터 (선택) / Symbol filter (optional)
 * @param search - 검색어 (선택) / Search keyword (optional)
 * @returns TanStack Query 결과 (StrategiesResponse) / TanStack Query result (StrategiesResponse)
 */
export function useStrategies(page = 1, symbol?: string, search?: string) {
  return useQuery<StrategiesResponse>({
    // page, symbol, search를 queryKey에 포함하여 필터 변경 시 자동 리페치
    // Include page, symbol, search in queryKey for automatic refetch on filter change
    queryKey: ['strategies', page, symbol, search],
    queryFn: async () => {
      // URL 쿼리 파라미터 조립 / Build URL query parameters
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      // 카테고리 필터 (CRYPTO/STOCK_KR/STOCK_US) 또는 개별 종목 / Category or individual symbol filter
      if (symbol && symbol !== 'ALL') {
        if (['CRYPTO', 'STOCK_KR', 'STOCK_US'].includes(symbol)) {
          params.set('category', symbol);
        } else {
          params.set('symbol', symbol);
        }
      }
      if (search) params.set('search', search);
      const { data } = await api.get(`/api/strategies?${params.toString()}`);

      // 백엔드 응답 구조 정규화 (strategies/data 키가 다를 수 있음)
      // Normalize backend response structure (strategies/data key may differ)
      const res = data.data ?? data;
      return {
        data: res.strategies ?? res.data ?? [],
        total: res.total ?? 0,
        page: res.page ?? page,
        limit: res.limit ?? 10,
        totalPages: res.totalPages ?? 1,
      };
    },
  });
}

/**
 * 단일 전략 상세 조회 훅 (댓글 포함)
 * Hook that fetches a single strategy detail (including comments)
 *
 * @param id - 전략 ID / Strategy ID
 * @returns TanStack Query 결과 (StrategyDetail) / TanStack Query result (StrategyDetail)
 */
export function useStrategy(id: string) {
  return useQuery<StrategyDetail>({
    queryKey: ['strategy', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/strategies/${id}`);
      return data.data ?? data;
    },
    // id가 없으면 쿼리 비활성화 (초기 렌더링 시 빈 문자열 방지)
    // Disable query when id is empty (prevents initial render with empty string)
    enabled: !!id,
  });
}

// ===== 전략 뮤테이션 훅 (Strategy Mutation Hooks) =====

/**
 * 새 전략 작성 뮤테이션 훅
 * Mutation hook for creating a new strategy
 *
 * @returns mutate 함수에 { symbol, title, description, performance? } 전달 / Pass { symbol, title, description, performance? } to mutate
 */
export function useCreateStrategy() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (body: { symbol: string; title: string; description: string; performance?: number }) => {
      const { data } = await api.post('/api/strategies', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      addToast(t('strategy.createSuccess'), 'success');
    },
  });
}

/**
 * 전략 수정 뮤테이션 훅
 * Mutation hook for updating a strategy
 *
 * @returns mutate 함수에 { id, symbol?, title?, description?, performance? } 전달 / Pass { id, symbol?, title?, description?, performance? } to mutate
 */
export function useUpdateStrategy() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; symbol?: string; title?: string; description?: string; performance?: number }) => {
      const { data } = await api.put(`/api/strategies/${id}`, body);
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      queryClient.invalidateQueries({ queryKey: ['strategy', vars.id] });
      addToast(t('strategy.updateSuccess'), 'success');
    },
  });
}

/**
 * 전략 삭제 뮤테이션 훅
 * Mutation hook for deleting a strategy
 *
 * @returns mutate 함수에 전략 ID 전달 / Pass strategy ID to mutate
 */
export function useDeleteStrategy() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/strategies/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      addToast(t('strategy.deleteSuccess'), 'success');
    },
  });
}

// ===== 좋아요 / 댓글 훅 (Like / Comment Hooks) =====

/**
 * 전략 좋아요 토글 뮤테이션 훅 (좋아요 ↔ 좋아요 취소)
 * Mutation hook for toggling strategy like (like ↔ unlike)
 *
 * @returns mutate 함수에 전략 ID 전달 / Pass strategy ID to mutate
 */
export function useLikeStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/strategies/${id}/like`);
      return data;
    },
    onSuccess: (_data, id) => {
      // 목록과 상세 양쪽의 좋아요 수를 업데이트하기 위해 캐시 무효화
      // Invalidate both list and detail caches to update like counts
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      queryClient.invalidateQueries({ queryKey: ['strategy', id] });
    },
  });
}

/**
 * 전략 댓글 작성 뮤테이션 훅 (대댓글 지원: parentId 전달 시)
 * Mutation hook for creating a strategy comment (supports replies via parentId)
 *
 * @returns mutate 함수에 { strategyId, content, parentId? } 전달 / Pass { strategyId, content, parentId? } to mutate
 */
export function useCreateStrategyComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ strategyId, content, parentId }: { strategyId: string; content: string; parentId?: string }) => {
      const { data } = await api.post(`/api/strategies/${strategyId}/comments`, { content, parentId });
      return data;
    },
    onSuccess: (_data, vars) => {
      // 전략 상세(댓글 목록)와 목록(댓글 수 카운트) 모두 갱신
      // Refresh both strategy detail (comment list) and strategies list (comment count)
      queryClient.invalidateQueries({ queryKey: ['strategy', vars.strategyId] });
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
    },
  });
}

/**
 * 전략 댓글 삭제 뮤테이션 훅
 * Mutation hook for deleting a strategy comment
 *
 * @returns mutate 함수에 { commentId, strategyId } 전달 / Pass { commentId, strategyId } to mutate
 */
export function useDeleteStrategyComment() {
  const queryClient = useQueryClient();
  return useMutation({
    // strategyId는 mutationFn에서는 사용하지 않지만, onSuccess에서 캐시 무효화에 필요
    // strategyId is unused in mutationFn but needed for cache invalidation in onSuccess
    mutationFn: async ({ commentId }: { commentId: string; strategyId: string }) => {
      const { data } = await api.delete(`/api/strategies/comments/${commentId}`);
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['strategy', vars.strategyId] });
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
    },
  });
}
