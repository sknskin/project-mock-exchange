/**
 * @file 글로벌 시장 지수 API 라우트
 * @description Yahoo Finance v8 Chart API를 통해 글로벌 시장 지수의
 *   실시간 가격, 등락률, 5일 스파크라인 데이터를 제공합니다. 60초 메모리 캐시 적용.
 *
 * @file Global Market Indices API Route
 * @description Provides real-time prices, change rates, and 5-day sparkline data for global
 *   market indices via Yahoo Finance v8 Chart API. 60s memory cache.
 */
import { NextResponse } from 'next/server';

interface YahooChartMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
}

const INDICES = [
  // 미국 주요 지수 / US Major Indices
  { symbol: '^GSPC', nameKo: 'S&P 500', nameEn: 'S&P 500', category: 'us' },
  { symbol: '^IXIC', nameKo: '나스닥', nameEn: 'NASDAQ', category: 'us' },
  { symbol: '^DJI', nameKo: '다우존스', nameEn: 'DOW 30', category: 'us' },
  { symbol: '^SOX', nameKo: 'SOX (반도체)', nameEn: 'SOX (Semicon)', category: 'us' },
  { symbol: '^RUT', nameKo: 'Russell 2000', nameEn: 'Russell 2000', category: 'us' },
  { symbol: '^VIX', nameKo: 'VIX', nameEn: 'VIX', category: 'us' },
  // 미국 선물 / US Futures
  { symbol: 'NQ=F', nameKo: '나스닥 선물', nameEn: 'NQ Futures', category: 'futures' },
  { symbol: 'ES=F', nameKo: 'S&P 선물', nameEn: 'ES Futures', category: 'futures' },
  { symbol: 'YM=F', nameKo: '다우 선물', nameEn: 'DOW Futures', category: 'futures' },
  // 한국 / Korea
  { symbol: '^KS11', nameKo: 'KOSPI', nameEn: 'KOSPI', category: 'asia' },
  { symbol: '^KQ11', nameKo: 'KOSDAQ', nameEn: 'KOSDAQ', category: 'asia' },
  // 아시아 / Asia
  { symbol: '^N225', nameKo: '닛케이 225', nameEn: 'Nikkei 225', category: 'asia' },
  { symbol: '^HSI', nameKo: '항셍', nameEn: 'Hang Seng', category: 'asia' },
  { symbol: '000001.SS', nameKo: '상해종합', nameEn: 'Shanghai Comp', category: 'asia' },
  { symbol: '^TWII', nameKo: '대만 가권', nameEn: 'TWSE', category: 'asia' },
  // 유럽 / Europe
  { symbol: '^FTSE', nameKo: 'FTSE 100', nameEn: 'FTSE 100', category: 'europe' },
  { symbol: '^GDAXI', nameKo: 'DAX', nameEn: 'DAX', category: 'europe' },
  { symbol: '^STOXX50E', nameKo: '유로스톡스 50', nameEn: 'Euro Stoxx 50', category: 'europe' },
  { symbol: '^FCHI', nameKo: 'CAC 40', nameEn: 'CAC 40', category: 'europe' },
  // 환율 / Forex
  { symbol: 'KRW=X', nameKo: 'USD/KRW', nameEn: 'USD/KRW', category: 'forex' },
  { symbol: 'EURUSD=X', nameKo: 'EUR/USD', nameEn: 'EUR/USD', category: 'forex' },
  { symbol: 'JPY=X', nameKo: 'USD/JPY', nameEn: 'USD/JPY', category: 'forex' },
  { symbol: 'GBPUSD=X', nameKo: 'GBP/USD', nameEn: 'GBP/USD', category: 'forex' },
  { symbol: 'CNY=X', nameKo: 'USD/CNY', nameEn: 'USD/CNY', category: 'forex' },
  // 채권 / Bonds
  { symbol: '^TNX', nameKo: '미국 10Y 금리', nameEn: 'US 10Y Yield', category: 'bonds' },
  { symbol: '^TYX', nameKo: '미국 30Y 금리', nameEn: 'US 30Y Yield', category: 'bonds' },
  { symbol: '^FVX', nameKo: '미국 5Y 금리', nameEn: 'US 5Y Yield', category: 'bonds' },
  // 원자재 / Commodities
  { symbol: 'GC=F', nameKo: '금', nameEn: 'Gold', category: 'commodities' },
  { symbol: 'SI=F', nameKo: '은', nameEn: 'Silver', category: 'commodities' },
  { symbol: 'CL=F', nameKo: 'WTI 원유', nameEn: 'WTI Crude', category: 'commodities' },
  { symbol: 'NG=F', nameKo: '천연가스', nameEn: 'Natural Gas', category: 'commodities' },
  { symbol: 'HG=F', nameKo: '구리', nameEn: 'Copper', category: 'commodities' },
  // 암호화폐 / Crypto
  { symbol: 'BTC-USD', nameKo: '비트코인', nameEn: 'Bitcoin', category: 'crypto' },
  { symbol: 'ETH-USD', nameKo: '이더리움', nameEn: 'Ethereum', category: 'crypto' },
  { symbol: 'SOL-USD', nameKo: '솔라나', nameEn: 'Solana', category: 'crypto' },
  { symbol: 'XRP-USD', nameKo: '리플', nameEn: 'XRP', category: 'crypto' },
] as const;

// 메모리 캐시: 60초 TTL
let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 60_000;

async function fetchChart(symbol: string) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const meta: YahooChartMeta = result?.meta;
    if (!meta?.regularMarketPrice) return null;

    // 5일간 종가 (마지막 값 = 오늘) / 5-day closes (last value = today)
    const closes: number[] = result?.indicators?.adjclose?.[0]?.adjclose ?? result?.indicators?.quote?.[0]?.close ?? [];
    const validCloses = closes.filter((v: number | null) => v != null);

    // 스파크라인: 5일 종가 데이터 그대로 사용 / Sparkline: use raw 5-day data
    const sparkline = validCloses.slice(-6);

    // 전일 종가: 마지막에서 2번째 (마지막 = 오늘) / Previous close: second-to-last (last = today)
    const previousClose = validCloses.length >= 2
      ? validCloses[validCloses.length - 2]
      : (meta.chartPreviousClose ?? meta.regularMarketPrice);

    return { price: meta.regularMarketPrice, previousClose, sparkline };
  } catch {
    return null;
  }
}

export async function GET() {
  // 캐시 확인
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const results = await Promise.allSettled(
    INDICES.map(async (idx) => {
      const data = await fetchChart(idx.symbol);
      if (!data || data.price === 0) return null;
      const change = data.price - data.previousClose;
      const changePercent = data.previousClose !== 0 ? (change / data.previousClose) * 100 : 0;
      return {
        symbol: idx.symbol,
        nameKo: idx.nameKo,
        nameEn: idx.nameEn,
        category: idx.category,
        price: data.price,
        change,
        changePercent,
        sparkline: data.sparkline,
      };
    }),
  );

  const indices: Array<{ symbol: string; nameKo: string; nameEn: string; category: string; price: number; change: number; changePercent: number; sparkline: number[] }> = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      indices.push(r.value);
    }
  }

  const response = { indices, updatedAt: new Date().toISOString() };
  cache = { data: response, timestamp: Date.now() };

  return NextResponse.json(response);
}
