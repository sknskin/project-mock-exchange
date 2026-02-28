'use client';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

interface ExchangeRateData {
  rate: number;
  updatedAt: Date;
}

const REFETCH_INTERVAL_MS = 30 * 60 * 1000; // 30분 / 30 minutes
const STALE_TIME_MS = 10 * 60 * 1000; // 10분 / 10 minutes

async function fetchExchangeRate(): Promise<ExchangeRateData> {
  const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW', {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch exchange rate');
  const data = await res.json();
  return { rate: data.rates.KRW, updatedAt: new Date() };
}

export function useExchangeRate(): UseQueryResult<ExchangeRateData> {
  return useQuery({
    queryKey: ['exchangeRate'],
    queryFn: fetchExchangeRate,
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: STALE_TIME_MS,
    retry: 2,
  });
}
