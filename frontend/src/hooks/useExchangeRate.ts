/**
 * @file 환율 조회 훅
 * @description Frankfurter API를 사용하여 USD → KRW 실시간 환율을 조회합니다.
 *              30분 간격으로 리페치하며, 10분 동안은 stale 데이터로 캐시를 재사용합니다.
 *
 * @file Exchange Rate Hook
 * @description Fetches real-time USD → KRW exchange rate from the Frankfurter API.
 *              Refetches every 30 minutes, with 10-minute stale time for cache reuse.
 */
'use client';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

// 환율 데이터 구조 / Exchange rate data structure
interface ExchangeRateData {
  /** USD → KRW 환율 / USD to KRW exchange rate */
  rate: number;
  /** 마지막 조회 시각 / Last fetched timestamp */
  updatedAt: Date;
}

// 환율은 자주 변하지 않으므로 30분 간격으로 리페치
// Exchange rates don't change frequently, so refetch every 30 minutes
const REFETCH_INTERVAL_MS = 30 * 60 * 1000; // 30분 / 30 minutes

// 10분 이내 데이터는 신선한 것으로 간주하여 불필요한 요청 방지
// Data within 10 minutes is considered fresh to prevent unnecessary requests
const STALE_TIME_MS = 10 * 60 * 1000; // 10분 / 10 minutes

/**
 * Frankfurter API에서 USD → KRW 환율을 가져오는 함수
 * Fetches USD → KRW exchange rate from the Frankfurter API
 *
 * @returns 환율 데이터 (rate, updatedAt) / Exchange rate data (rate, updatedAt)
 */
async function fetchExchangeRate(): Promise<ExchangeRateData> {
  // cache: 'no-store'로 브라우저 캐시 방지 — 항상 최신 환율 조회
  // cache: 'no-store' disables browser cache — always fetch latest rate
  const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW', {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch exchange rate');
  const data = await res.json();
  return { rate: data.rates.KRW, updatedAt: new Date() };
}

/**
 * USD → KRW 환율을 조회하는 React Query 훅
 * React Query hook for fetching USD → KRW exchange rate
 *
 * @returns UseQueryResult<ExchangeRateData> — rate(환율), updatedAt(갱신시각) 포함
 *          UseQueryResult<ExchangeRateData> — includes rate and updatedAt
 */
export function useExchangeRate(): UseQueryResult<ExchangeRateData> {
  return useQuery({
    queryKey: ['exchangeRate'],
    queryFn: fetchExchangeRate,
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: STALE_TIME_MS,
    // 네트워크 오류 시 최대 2회 재시도 / Retry up to 2 times on network error
    retry: 2,
  });
}
