'use client';
import { useQuery } from '@tanstack/react-query';

interface ExchangeRateData {
  rate: number;
  updatedAt: Date;
}

async function fetchExchangeRate(): Promise<ExchangeRateData> {
  const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW', {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch exchange rate');
  const data = await res.json();
  return { rate: data.rates.KRW, updatedAt: new Date() };
}

export function useExchangeRate() {
  return useQuery({
    queryKey: ['exchangeRate'],
    queryFn: fetchExchangeRate,
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
}
