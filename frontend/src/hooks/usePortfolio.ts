/**
 * @file 포트폴리오 훅
 * @description TanStack Query로 잔고, 보유 자산, 거래 내역을 조회합니다
 *
 * @file Portfolio Hook
 * @description Fetches balance, holdings, and transactions via TanStack Query
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Portfolio } from '@/types';

// ===== 데이터 변환 유틸리티 (Data Transformation Utilities) =====

/**
 * API 응답에서 실제 데이터를 추출하는 유틸리티
 * 백엔드가 { success: true, data: {...} } 래퍼로 응답할 수 있으므로 내부 data를 추출합니다.
 *
 * Utility to unwrap actual data from API response.
 * Backend may respond with { success: true, data: {...} } wrapper, so we extract the inner data.
 *
 * @param data - API 응답 데이터 / API response data
 * @returns 언랩된 실제 데이터 / Unwrapped actual data
 */
function unwrapResponse<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as Record<string, unknown>).data as T;
  }
  return data as T;
}

/**
 * 백엔드 summary/valuation 응답을 프론트엔드 Portfolio 타입으로 변환하는 함수
 * 백엔드 필드명(availableCash, avgCostBasis, unrealizedPnL 등)을 프론트엔드 필드명으로 매핑하고,
 * 문자열로 전달된 숫자 값들을 parseFloat로 변환합니다.
 * 또한 총 수익률, 투자 수익률 등 파생 값을 계산합니다.
 *
 * Transforms backend summary/valuation response to frontend Portfolio type.
 * Maps backend field names (availableCash, avgCostBasis, unrealizedPnL, etc.) to frontend field names,
 * and converts string-encoded numbers via parseFloat.
 * Also computes derived values like total PnL percentage and invested return percentage.
 *
 * @param raw - 백엔드 원본 응답 객체 / Raw backend response object
 * @returns 프론트엔드 Portfolio 타입 / Frontend Portfolio type
 */
function mapSummaryToPortfolio(raw: Record<string, unknown>): Portfolio {
  // 잔고 정보 추출 (availableCash 우선, totalCash 폴백)
  // Extract balance info (prefer availableCash, fallback to totalCash)
  const balance = raw.balance as Record<string, string> | undefined;
  const holdings = (raw.holdings as Record<string, unknown>[]) ?? [];
  const cashBalance = parseFloat(balance?.availableCash ?? balance?.totalCash ?? '0') || 0;
  const totalValue = parseFloat(raw.totalPortfolioValue as string ?? '0') || cashBalance;

  // 보유 자산별 필드명 매핑 및 숫자 변환
  // Map field names and convert to numbers for each holding
  const mappedHoldings = holdings.map((h: Record<string, unknown>) => ({
    symbol: String(h.symbol ?? ''),
    name: String(h.name ?? h.symbol ?? ''),
    quantity: parseFloat(String(h.quantity ?? '0')) || 0,
    // avgCostBasis = 평균 매수 단가 / Average cost basis
    averagePrice: parseFloat(String(h.avgCostBasis ?? '0')) || 0,
    currentPrice: parseFloat(String(h.currentPrice ?? h.avgCostBasis ?? '0')) || 0,
    // marketValue 우선, 없으면 totalCost 폴백 / Prefer marketValue, fallback to totalCost
    value: parseFloat(String(h.marketValue ?? h.totalCost ?? '0')) || 0,
    pnl: parseFloat(String(h.unrealizedPnL ?? '0')) || 0,
    pnlPercent: parseFloat(String(h.unrealizedPnLPercent ?? '0')) || 0,
  }));

  // 파생 값 계산 / Calculate derived values
  const investedValue = mappedHoldings.reduce((sum, h) => sum + h.value, 0);
  const unrealizedPnl = mappedHoldings.reduce((sum, h) => sum + h.pnl, 0);
  const realizedPnl = parseFloat(raw.totalRealizedPnL as string ?? '0') || 0;
  // 총 손익 = 미실현 + 실현 / Total PnL = unrealized + realized
  const totalPnl = unrealizedPnl + realizedPnl;
  const totalCost = parseFloat(raw.totalCost as string ?? '0')
    || mappedHoldings.reduce((sum, h) => sum + (h.averagePrice * h.quantity), 0);
  const totalMarketValue = parseFloat(raw.totalMarketValue as string ?? '0') || investedValue;
  // 순입금액 = 총자산 - 총손익 (투자 원금 추정) / Net deposit = total value - total PnL (estimated principal)
  const netDeposit = totalValue - totalPnl;
  // 총 수익률 = 총손익 / 순입금액 * 100 / Total PnL % = total PnL / net deposit * 100
  const totalPnlPercent = netDeposit > 0 ? (totalPnl / netDeposit) * 100 : 0;
  // 투자 수익률 = 미실현 손익 / 총매수 비용 * 100 / Invested return % = unrealized PnL / total cost * 100
  const investedReturnPercent = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;

  return {
    totalValue, cashBalance, investedValue, totalCost, totalMarketValue,
    totalPnl, totalPnlPercent, investedReturnPercent,
    realizedPnl, unrealizedPnl, netDeposit,
    holdings: mappedHoldings,
  };
}

// ===== 포트폴리오 조회 훅 (Portfolio Query Hooks) =====

/**
 * 포트폴리오 요약(잔고 + 보유 자산)을 조회하는 훅
 * Hook that fetches portfolio summary (balance + holdings)
 *
 * @returns TanStack Query 결과 (Portfolio) / TanStack Query result (Portfolio)
 */
export function usePortfolio() {
  return useQuery<Portfolio>({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const { data } = await api.get('/api/portfolio/summary');
      const raw = unwrapResponse<Record<string, unknown>>(data);
      return mapSummaryToPortfolio(raw);
    },
    // 10초마다 리페치하여 보유 자산 가치 변동 반영
    // Refetch every 10s to reflect holding value changes
    refetchInterval: 10000,
  });
}

/**
 * 포트폴리오 시가 평가 데이터를 조회하는 훅 (현재가 기반)
 * Hook that fetches portfolio valuation data (based on current market prices)
 *
 * @returns TanStack Query 결과 (Portfolio) / TanStack Query result (Portfolio)
 */
export function usePortfolioValuation() {
  return useQuery<Portfolio>({
    queryKey: ['portfolio', 'valuation'],
    queryFn: async () => {
      const { data } = await api.get('/api/portfolio/valuation');
      const raw = unwrapResponse<Record<string, unknown>>(data);
      return mapSummaryToPortfolio(raw);
    },
    refetchInterval: 10000,
  });
}

// ===== 입출금 뮤테이션 훅 (Deposit / Withdraw Mutation Hooks) =====

/**
 * 가상 입금 뮤테이션 훅
 * Mutation hook for virtual deposit
 *
 * @returns mutate 함수에 입금 금액(USD) 전달 / Pass deposit amount (USD) to mutate
 */
export function useDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await api.post('/api/portfolio/deposit', { amount });
      return unwrapResponse(data);
    },
    onSuccess: () => {
      // 잔고 변경 → 포트폴리오 캐시 갱신 / Balance changed → refresh portfolio cache
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

/**
 * 가상 출금 뮤테이션 훅
 * Mutation hook for virtual withdrawal
 *
 * @returns mutate 함수에 출금 금액(USD) 전달 / Pass withdrawal amount (USD) to mutate
 */
export function useWithdraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await api.post('/api/portfolio/withdraw', { amount });
      return unwrapResponse(data);
    },
    onSuccess: () => {
      // 잔고 변경 → 포트폴리오 캐시 갱신 / Balance changed → refresh portfolio cache
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

/**
 * 계정 초기화 뮤테이션 훅 — 보유 자산, 거래 내역 삭제 및 잔고 리셋
 * Mutation hook for account reset — deletes holdings, transactions, resets balance
 *
 * @returns mutate 함수 호출 시 계정 초기화 실행 / Triggers account reset when mutate is called
 */
// ===== 거래 내역 조회 훅 (Transaction History Hook) =====

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BUY' | 'SELL' | 'RESERVE' | 'RELEASE';
  symbol?: string;
  quantity?: number;
  price?: number;
  cashDelta: number;
  realizedPnL?: number;
  createdAt: string;
}

/**
 * 거래 내역을 조회하는 훅
 * Hook that fetches transaction history
 */
export function useTransactions(limit = 200) {
  return useQuery<Transaction[]>({
    queryKey: ['portfolio', 'transactions', limit],
    queryFn: async () => {
      const { data } = await api.get(`/api/portfolio/transactions?limit=${limit}&offset=0`);
      const raw = unwrapResponse<{ transactions?: Transaction[]; items?: Transaction[] } | Transaction[]>(data);
      if (Array.isArray(raw)) return raw;
      return raw.transactions ?? raw.items ?? [];
    },
  });
}

export function useResetAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/portfolio/reset');
      return unwrapResponse(data);
    },
    onSuccess: () => {
      // 계정 초기화 → 포트폴리오 및 관련 캐시 전체 갱신
      // Account reset → refresh all portfolio and related caches
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
