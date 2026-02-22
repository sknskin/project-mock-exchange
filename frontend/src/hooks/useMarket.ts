/**
 * @file 마켓 데이터 훅
 * @description TanStack Query로 시세, 자산 목록, 기간별 등락률을 조회합니다
 *
 * @file Market Data Hook
 * @description Fetches prices, assets, and period changes via TanStack Query
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Asset, Candlestick, OrderBook, Trade } from '@/types';

export function useMarketPrices() {
  return useQuery<Asset[]>({
    queryKey: ['market', 'prices'],
    queryFn: async () => {
      const { data } = await api.get('/api/market/prices');
      return data.data ?? data;
    },
    refetchInterval: 5000,
  });
}

export function useAssetPrice(symbol: string) {
  return useQuery<Asset>({
    queryKey: ['market', 'price', symbol],
    queryFn: async () => {
      const { data } = await api.get(`/api/market/prices/${symbol}`);
      return data.data ?? data;
    },
    refetchInterval: 3000,
    enabled: !!symbol,
  });
}

export function useAssets() {
  return useQuery({
    queryKey: ['market', 'assets'],
    queryFn: async () => {
      const { data } = await api.get('/api/market/assets');
      return data.data ?? data;
    },
  });
}

const INTERVAL_MS: Record<string, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '1d': 86_400_000,
};

function aggregateCandles(candles1m: Candlestick[], interval: string): Candlestick[] {
  const ms = INTERVAL_MS[interval];
  if (!ms || ms <= 60_000) return candles1m;

  const sorted = [...candles1m].sort((a, b) => a.time - b.time);
  const groups = new Map<number, Candlestick[]>();

  for (const c of sorted) {
    const bucket = Math.floor(c.time / ms) * ms;
    if (!groups.has(bucket)) groups.set(bucket, []);
    groups.get(bucket)!.push(c);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([time, bars]) => ({
      time,
      open: bars[0].open,
      high: Math.max(...bars.map((b) => b.high)),
      low: Math.min(...bars.map((b) => b.low)),
      close: bars[bars.length - 1].close,
      volume: bars.reduce((sum, b) => sum + b.volume, 0),
    }));
}

export function useCandlesticks(
  symbol: string,
  interval: string = '1m',
  limit: number = 2000,
) {
  const fetchLimit = interval === '1m' ? limit
    : interval === '5m' ? limit * 5
    : interval === '15m' ? limit * 15
    : interval === '1h' ? Math.min(limit * 60, 20000)
    : Math.min(limit * 1440, 50000);

  return useQuery<Candlestick[]>({
    queryKey: ['market', 'candlesticks', symbol, interval],
    queryFn: async () => {
      const { data } = await api.get(
        `/api/market/prices/${symbol}/candlesticks`,
        { params: { interval: '1m', limit: fetchLimit } },
      );
      const raw = data.data ?? data;
      const seen = new Set<number>();
      const candles1m: Candlestick[] = [];

      for (const d of raw) {
        const time = new Date(d.openTime).getTime();
        if (seen.has(time)) continue;
        seen.add(time);

        const open = Number(d.openPrice);
        const high = Number(d.highPrice);
        const low = Number(d.lowPrice);
        const close = Number(d.closePrice);
        const volume = Number(d.volume);

        // 유효하지 않은 캔들 필터링 / Filter invalid candles
        if (!open || !high || !low || !close || !isFinite(open) || !isFinite(high) || !isFinite(low) || !isFinite(close)) continue;

        candles1m.push({ time, open, high, low, close, volume: isFinite(volume) ? volume : 0 });
      }

      return aggregateCandles(candles1m, interval);
    },
    enabled: !!symbol,
  });
}

export function useOrderBook(symbol: string) {
  return useQuery<OrderBook>({
    queryKey: ['market', 'orderbook', symbol],
    queryFn: async () => {
      const { data } = await api.get(`/api/orders/book/${symbol}`);
      return data.data ?? data;
    },
    refetchInterval: 3000,
    enabled: !!symbol,
    retry: false,
  });
}

export interface PeriodChange {
  symbol: string;
  currentPrice: number;
  basePrice: number;
  changeAmount: number;
  changePercent: number;
}

export function usePeriodChanges(period: string) {
  return useQuery<PeriodChange[]>({
    queryKey: ['market', 'period-changes', period],
    queryFn: async () => {
      const { data } = await api.get('/api/market/prices/period-changes', {
        params: { period },
      });
      return data.data ?? data;
    },
    enabled: period !== 'realtime',
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useRecentTrades(symbol: string, enabled: boolean = true) {
  return useQuery<Trade[]>({
    queryKey: ['market', 'trades', symbol],
    queryFn: async () => {
      const { data } = await api.get('/api/orders/trades/history', {
        params: { symbol },
      });
      return data.data ?? data;
    },
    refetchInterval: 5000,
    enabled: !!symbol && enabled,
  });
}
