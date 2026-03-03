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

// API 응답에서 실제 데이터 추출 (Unwrap { success, data } wrapper with null guard)
function unwrapResponse<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as Record<string, unknown>).data as T;
  }
  return data as T;
}

// 백엔드 summary 응답을 프론트엔드 Portfolio 타입으로 변환
function mapSummaryToPortfolio(raw: Record<string, unknown>): Portfolio {
  const balance = raw.balance as Record<string, string> | undefined;
  const holdings = (raw.holdings as Record<string, unknown>[]) ?? [];
  const cashBalance = parseFloat(balance?.availableCash ?? balance?.totalCash ?? '0') || 0;
  const totalValue = parseFloat(raw.totalPortfolioValue as string ?? '0') || cashBalance;

  const mappedHoldings = holdings.map((h: Record<string, unknown>) => ({
    symbol: String(h.symbol ?? ''),
    name: String(h.name ?? h.symbol ?? ''),
    quantity: parseFloat(String(h.quantity ?? '0')) || 0,
    averagePrice: parseFloat(String(h.avgCostBasis ?? '0')) || 0,
    currentPrice: parseFloat(String(h.currentPrice ?? h.avgCostBasis ?? '0')) || 0,
    value: parseFloat(String(h.marketValue ?? h.totalCost ?? '0')) || 0,
    pnl: parseFloat(String(h.unrealizedPnL ?? '0')) || 0,
    pnlPercent: parseFloat(String(h.unrealizedPnLPercent ?? '0')) || 0,
  }));

  const investedValue = mappedHoldings.reduce((sum, h) => sum + h.value, 0);
  const unrealizedPnl = mappedHoldings.reduce((sum, h) => sum + h.pnl, 0);
  const realizedPnl = parseFloat(raw.totalRealizedPnL as string ?? '0') || 0;
  const totalPnl = unrealizedPnl + realizedPnl;
  const totalCost = parseFloat(raw.totalCost as string ?? '0')
    || mappedHoldings.reduce((sum, h) => sum + (h.averagePrice * h.quantity), 0);
  const totalMarketValue = parseFloat(raw.totalMarketValue as string ?? '0') || investedValue;
  const netDeposit = totalValue - totalPnl;
  const totalPnlPercent = netDeposit > 0 ? (totalPnl / netDeposit) * 100 : 0;
  const investedReturnPercent = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;

  return {
    totalValue, cashBalance, investedValue, totalCost, totalMarketValue,
    totalPnl, totalPnlPercent, investedReturnPercent,
    realizedPnl, unrealizedPnl, netDeposit,
    holdings: mappedHoldings,
  };
}

export function usePortfolio() {
  return useQuery<Portfolio>({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const { data } = await api.get('/api/portfolio/summary');
      const raw = unwrapResponse<Record<string, unknown>>(data);
      return mapSummaryToPortfolio(raw);
    },
    refetchInterval: 10000,
  });
}

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

export function useDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await api.post('/api/portfolio/deposit', { amount });
      return unwrapResponse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await api.post('/api/portfolio/withdraw', { amount });
      return unwrapResponse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}
