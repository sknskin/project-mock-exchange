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

export function useCandlesticks(
  symbol: string,
  interval: string = '1h',
  limit: number = 100,
) {
  return useQuery<Candlestick[]>({
    queryKey: ['market', 'candlesticks', symbol, interval],
    queryFn: async () => {
      const { data } = await api.get(
        `/api/market/prices/${symbol}/candlesticks`,
        { params: { interval, limit } },
      );
      return data.data ?? data;
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
  });
}

export function useRecentTrades(symbol: string) {
  return useQuery<Trade[]>({
    queryKey: ['market', 'trades', symbol],
    queryFn: async () => {
      const { data } = await api.get('/api/orders/trades/history');
      return data.data ?? data;
    },
    refetchInterval: 5000,
    enabled: !!symbol,
  });
}
