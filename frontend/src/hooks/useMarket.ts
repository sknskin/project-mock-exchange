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

// ===== 가격 조회 훅 (Price Query Hooks) =====

/**
 * 전체 종목의 현재 가격을 조회하는 훅
 * Hook that fetches current prices for all assets
 *
 * @returns TanStack Query 결과 (Asset[]) / TanStack Query result (Asset[])
 */
export function useMarketPrices() {
  return useQuery<Asset[]>({
    queryKey: ['market', 'prices'],
    queryFn: async () => {
      const { data } = await api.get('/api/market/prices');
      return data.data ?? data;
    },
    // B-H-02: WebSocket이 실시간 업데이트를 처리; REST 폴링은 5분 주기 백업 전용
    // B-H-02: WebSocket handles real-time updates; REST polling is a 5-min fallback only
    refetchInterval: 300_000,
    // REST 폴링 데이터가 WebSocket 실시간 데이터를 덮어쓰지 않도록 stale 시간 설정
    // Prevent REST polling from overwriting WebSocket real-time data
    staleTime: 290_000,
  });
}

/**
 * 특정 종목의 현재 가격을 조회하는 훅
 * Hook that fetches the current price for a specific asset
 *
 * @param symbol - 종목 심볼 (예: 'BTCUSDT') / Asset symbol (e.g., 'BTCUSDT')
 * @returns TanStack Query 결과 (Asset) / TanStack Query result (Asset)
 */
export function useAssetPrice(symbol: string) {
  return useQuery<Asset>({
    queryKey: ['market', 'price', symbol],
    queryFn: async () => {
      const { data } = await api.get(`/api/market/prices/${symbol}`);
      return data.data ?? data;
    },
    // B-H-02: WebSocket이 실시간 업데이트를 처리; REST 폴링은 5분 주기 백업 전용
    // B-H-02: WebSocket handles real-time updates; REST polling is a 5-min fallback only
    refetchInterval: 300_000,
    staleTime: 290_000,
    enabled: !!symbol,
  });
}

/**
 * 거래 가능한 전체 자산 목록을 조회하는 훅
 * Hook that fetches the list of all tradable assets
 *
 * @returns TanStack Query 결과 / TanStack Query result
 */
export function useAssets() {
  return useQuery({
    queryKey: ['market', 'assets'],
    queryFn: async () => {
      const { data } = await api.get('/api/market/assets');
      return data.data ?? data;
    },
  });
}

// ===== 캔들스틱 집계 로직 (Candlestick Aggregation Logic) =====

/**
 * 캔들스틱 interval별 밀리초 매핑
 * 클라이언트 사이드에서 1m 데이터를 상위 interval로 집계할 때 사용
 *
 * Millisecond mapping per candlestick interval.
 * Used for client-side aggregation of 1m data into higher intervals.
 */
const INTERVAL_MS: Record<string, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
};

/**
 * 1분봉 데이터를 지정된 interval로 집계하는 함수
 * 예: 1m 데이터 60개 → 1h 캔들 1개로 합산
 *
 * Aggregates 1-minute candle data into the specified interval.
 * Example: 60 x 1m candles → 1 x 1h candle
 *
 * @param candles1m - 1분봉 원본 데이터 / Source 1-minute candle data
 * @param interval - 목표 interval ('1m', '5m', '15m', '1h', '4h', '1d') / Target interval
 * @returns 집계된 캔들스틱 배열 / Aggregated candlestick array
 */
function aggregateCandles(candles1m: Candlestick[], interval: string): Candlestick[] {
  const ms = INTERVAL_MS[interval];
  // 1m이거나 알 수 없는 interval이면 원본 반환 / Return as-is for 1m or unknown intervals
  if (!ms || ms <= 60_000) return candles1m;

  // 시간순 정렬 후 interval 단위 버킷에 그룹핑
  // Sort chronologically, then group into interval-sized buckets
  const sorted = [...candles1m].sort((a, b) => a.time - b.time);
  const groups = new Map<number, Candlestick[]>();

  for (const c of sorted) {
    // timestamp를 interval 크기로 내림하여 동일 버킷으로 분류
    // Floor timestamp by interval size to assign to the same bucket
    const bucket = Math.floor(c.time / ms) * ms;
    if (!groups.has(bucket)) groups.set(bucket, []);
    groups.get(bucket)!.push(c);
  }

  // 각 버킷의 OHLCV 계산: open=첫봉, close=마지막봉, high/low=최대/최소, volume=합산
  // Calculate OHLCV per bucket: open=first bar, close=last bar, high/low=max/min, volume=sum
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

/**
 * 특정 종목의 캔들스틱(OHLCV) 데이터를 조회하는 훅
 * 백엔드가 해당 interval을 직접 지원하지 않으면, 1m 데이터를 가져와 클라이언트에서 집계합니다.
 *
 * Hook that fetches candlestick (OHLCV) data for a specific symbol.
 * If the backend doesn't support the requested interval, fetches 1m data and aggregates client-side.
 *
 * @param symbol - 종목 심볼 (예: 'BTCUSDT') / Asset symbol (e.g., 'BTCUSDT')
 * @param interval - 캔들 interval (기본: '1m') / Candle interval (default: '1m')
 * @param limit - 요청할 캔들 수 (기본: 2000) / Number of candles to request (default: 2000)
 * @returns TanStack Query 결과 (Candlestick[]) / TanStack Query result (Candlestick[])
 */
export function useCandlesticks(
  symbol: string,
  interval: string = '1m',
  limit: number = 2000,
) {
  // 상위 interval 집계를 위해 필요한 1m 데이터 수를 계산
  // 예: 5m 캔들 100개를 만들려면 1m 데이터 500개 필요
  // Calculate how many 1m candles are needed for higher interval aggregation
  // Example: 100 x 5m candles require 500 x 1m data points
  const fetchLimit = interval === '1m' ? limit
    : interval === '5m' ? limit * 5
    : interval === '15m' ? limit * 15
    : interval === '1h' ? Math.min(limit * 60, 5000)
    : interval === '4h' ? Math.min(limit * 240, 5000)
    : Math.min(limit * 1440, 2000);

  return useQuery<Candlestick[]>({
    queryKey: ['market', 'candlesticks', symbol, interval],
    queryFn: async () => {
      // 1단계: 먼저 요청한 interval로 시도
      // Step 1: Try the requested interval first
      const { data } = await api.get(
        `/api/market/prices/${symbol}/candlesticks`,
        { params: { interval, limit: interval === '1m' ? fetchLimit : limit } },
      );
      let raw = data.data ?? data;

      // 2단계: 요청한 interval에 데이터가 없으면 1m 데이터로 폴백하여 클라이언트 집계
      // Step 2: Fallback to 1m data for client-side aggregation if requested interval is empty
      if ((!raw || raw.length === 0) && interval !== '1m') {
        const fallback = await api.get(
          `/api/market/prices/${symbol}/candlesticks`,
          { params: { interval: '1m', limit: fetchLimit } },
        );
        raw = fallback.data.data ?? fallback.data;
      }

      if (!raw || raw.length === 0) return [];

      // 3단계: 백엔드 응답을 Candlestick 타입으로 변환 (중복 제거, 유효성 검사 포함)
      // Step 3: Transform backend response to Candlestick type (with dedup + validation)
      const seen = new Set<number>();
      const candles1m: Candlestick[] = [];

      for (const d of raw) {
        const time = new Date(d.openTime).getTime();
        // 동일 타임스탬프 중복 방지 / Prevent duplicate timestamps
        if (seen.has(time)) continue;
        seen.add(time);

        const open = Number(d.openPrice);
        const high = Number(d.highPrice);
        const low = Number(d.lowPrice);
        const close = Number(d.closePrice);
        const volume = Number(d.volume);

        // NaN이나 Infinity인 가격 데이터는 무효 — 차트에 렌더링하면 오류 발생 (0은 유효한 값)
        // Invalid price data (NaN or Infinity) — would cause chart rendering errors (0 is valid)
        if (!Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) continue;

        candles1m.push({ time, open, high, low, close, volume: isFinite(volume) ? volume : 0 });
      }

      // 4단계: 1m 데이터를 요청된 interval로 집계 / Step 4: Aggregate 1m data into requested interval
      return aggregateCandles(candles1m, interval);
    },
    enabled: !!symbol,
    // WebSocket이 실시간 업데이트를 처리; REST 폴링은 백업용 (1분 간격)
    // WebSocket handles real-time updates; REST polling serves as a fallback (1-minute interval)
    refetchInterval: 60_000,
  });
}

// ===== 호가 / 기간별 변동 / 체결 내역 훅 (Order Book / Period Changes / Recent Trades) =====

/**
 * 특정 종목의 호가창(오더북) 데이터를 조회하는 훅
 * Hook that fetches order book data for a specific symbol
 *
 * @param symbol - 종목 심볼 / Asset symbol
 * @returns TanStack Query 결과 (OrderBook) / TanStack Query result (OrderBook)
 */
export function useOrderBook(symbol: string) {
  return useQuery<OrderBook>({
    queryKey: ['market', 'orderbook', symbol],
    queryFn: async () => {
      const { data } = await api.get(`/api/orders/book/${symbol}`);
      return data.data ?? data;
    },
    // B-H-02: WebSocket이 실시간 업데이트를 처리; REST 폴링은 5분 주기 백업 전용
    // B-H-02: WebSocket handles real-time updates; REST polling is a 5-min fallback only
    refetchInterval: 300_000,
    staleTime: 290_000,
    enabled: !!symbol,
    // 호가 데이터가 없을 경우 재시도하지 않음 (빈 오더북은 정상)
    // Don't retry when no order book data (empty order book is normal)
    retry: false,
  });
}

/** 기간별 가격 변동 정보
 * Period-based price change information */
export interface PeriodChange {
  symbol: string;
  currentPrice: number;
  /** 기준 가격 (기간 시작 시점)
   * Base price (at period start) */
  basePrice: number;
  changeAmount: number;
  changePercent: number;
}

/**
 * 기간별 가격 등락률을 조회하는 훅
 * Hook that fetches price changes for a given period
 *
 * @param period - 기간 ('1h', '24h', '7d', '30d' 등; 'realtime'이면 비활성화) / Period ('1h', '24h', '7d', '30d', etc.; disabled if 'realtime')
 * @returns TanStack Query 결과 (PeriodChange[]) / TanStack Query result (PeriodChange[])
 */
export function usePeriodChanges(period: string) {
  return useQuery<PeriodChange[]>({
    queryKey: ['market', 'period-changes', period],
    queryFn: async () => {
      const { data } = await api.get('/api/market/prices/period-changes', {
        params: { period },
      });
      return data.data ?? data;
    },
    // 'realtime' 모드에서는 WebSocket으로 처리하므로 REST 비활성화
    // Disabled in 'realtime' mode since WebSocket handles it
    enabled: period !== 'realtime',
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

/**
 * 특정 종목의 최근 체결 내역을 조회하는 훅
 * Hook that fetches recent trade history for a specific symbol
 *
 * @param symbol - 종목 심볼 / Asset symbol
 * @param enabled - 쿼리 활성화 여부 (기본: true) / Whether to enable query (default: true)
 * @returns TanStack Query 결과 (Trade[]) / TanStack Query result (Trade[])
 */
export function useRecentTrades(symbol: string, enabled: boolean = true) {
  return useQuery<Trade[]>({
    queryKey: ['market', 'trades', symbol],
    queryFn: async () => {
      const { data } = await api.get('/api/orders/trades/history', {
        params: { symbol },
      });
      const raw: Record<string, unknown>[] = data.data ?? data;
      // 백엔드 체결 데이터를 프론트엔드 Trade 타입으로 변환
      // Transform backend trade data to frontend Trade type
      return raw.map((t) => ({
        id: String(t.tradeId ?? ''),
        symbol: String(t.symbol ?? ''),
        price: Number(t.price) || 0,
        quantity: Number(t.quantity) || 0,
        // side 결정 로직: isBuyerMaker=true → taker가 매도(SELL), false → taker가 매수(BUY)
        // Side logic: isBuyerMaker=true → taker is seller (SELL), false → taker is buyer (BUY)
        side: (t.isBuyerMaker === true ? 'SELL' : 'BUY') as Trade['side'],
        timestamp: String(t.executedAt ?? ''),
      }));
    },
    // B-H-02: WebSocket이 실시간 업데이트를 처리; REST 폴링은 5분 주기 백업 전용
    // B-H-02: WebSocket handles real-time updates; REST polling is a 5-min fallback only
    refetchInterval: 300_000,
    staleTime: 290_000,
    enabled: !!symbol && enabled,
  });
}
