/**
 * @file 마켓 인덱스 요약 (마키)
 * @description 글로벌 시장 지수를 마키(좌측 자동 스크롤)로 보여줍니다
 *
 * @file Market Index Summary (Marquee)
 * @description Shows global market indices as a left-scrolling marquee
 */
'use client';

import { useMemo, useRef, useEffect } from 'react';
import { cn, formatCompactPrice, formatPercent } from '@/lib/format';
import type { Asset } from '@/types';

interface MarketIndexSummaryProps {
  assets: Asset[];
}

interface IndexData {
  name: string;
  value: number;
  changePercent: number;
  sparkline: number[];
  format?: 'price' | 'krw' | 'marketcap' | 'percent' | 'vix';
}

/* ─── 지수별 심볼 그룹 / Symbol groups per index ─── */

// 한국 시장 / Korean Market
const KOSPI_SYMBOLS = ['005930.KS', '000660.KS', '035420.KS', '005380.KS', '051910.KS', '006400.KS', '035720.KS', '003550.KS', '028260.KS', '105560.KS'];
const KOSDAQ_SYMBOLS = ['247540.KS', '068270.KS', '196170.KS', '028300.KS', '053800.KS', '112040.KS', '036570.KS', '293490.KS'];

// 미국 시장 / US Market
const NASDAQ_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX', 'AMD', 'INTC'];
const SP500_SYMBOLS = ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'JPM', 'V', 'WMT', 'DIS', 'BA', 'NKE', 'CRM'];
const DOW_SYMBOLS = ['AAPL', 'MSFT', 'JPM', 'V', 'WMT', 'DIS', 'BA', 'NKE', 'CRM', 'AMZN'];
const RUSSELL_SYMBOLS = ['AMD', 'INTC', 'NFLX', 'CRM', 'NKE', 'DIS'];
const SOX_SYMBOLS = ['NVDA', 'AMD', 'INTC', 'TSLA', 'AAPL', 'GOOGL'];

// 유럽 시장 프록시 / European Market (proxied via available US stocks)
const DAX_PROXY = ['MSFT', 'AMZN', 'META', 'CRM', 'V', 'JPM'];
const FTSE_PROXY = ['AAPL', 'BA', 'DIS', 'WMT', 'NKE', 'JPM'];
const CAC_PROXY = ['GOOGL', 'META', 'AMZN', 'V', 'CRM'];
const EUROSTOXX_PROXY = ['MSFT', 'AAPL', 'AMZN', 'META', 'JPM', 'V', 'BA'];

// 아시아 시장 프록시 / Asian Market (proxied)
const NIKKEI_PROXY = ['AAPL', 'GOOGL', 'NVDA', 'TSLA', 'INTC', 'AMD'];
const HANGSENG_PROXY = ['AMZN', 'META', 'MSFT', 'V', 'WMT'];
const SHANGHAI_PROXY = ['JPM', 'BA', 'DIS', 'NKE', 'CRM'];

// 암호화폐 / Crypto
const CRYPTO_ALL = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD', 'ADA-USD', 'AVAX-USD', 'LINK-USD', 'DOT-USD'];
const DEFI_SYMBOLS = ['ETH-USD', 'SOL-USD', 'AVAX-USD', 'LINK-USD', 'DOT-USD'];
const ALTCOIN_SYMBOLS = ['ETH-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD', 'ADA-USD', 'AVAX-USD', 'LINK-USD', 'DOT-USD'];
const MEME_SYMBOLS = ['DOGE-USD', 'XRP-USD', 'ADA-USD'];
const L1_SYMBOLS = ['ETH-USD', 'SOL-USD', 'ADA-USD', 'AVAX-USD', 'DOT-USD'];

// 원자재 프록시 / Commodity (proxied)
const GOLD_PROXY = ['BTC-USD', 'ETH-USD'];
const OIL_PROXY = ['SOL-USD', 'XRP-USD', 'LINK-USD'];
const VIX_PROXY = ['DOGE-USD', 'ADA-USD', 'AVAX-USD'];

/* ─── 지수 정의 / Index definitions ─── */

interface IndexDef {
  name: string;
  symbols: string[];
  base: number;
  format?: IndexData['format'];
}

const INDEX_DEFS: IndexDef[] = [
  // 한국 / Korean
  { name: 'KOSPI', symbols: KOSPI_SYMBOLS, base: 2654.32, format: 'krw' },
  { name: 'KOSDAQ', symbols: KOSDAQ_SYMBOLS, base: 872.45, format: 'krw' },
  { name: 'KRX 300', symbols: [...KOSPI_SYMBOLS, ...KOSDAQ_SYMBOLS], base: 381.56, format: 'krw' },

  // 미국 / US
  { name: 'NASDAQ 100', symbols: NASDAQ_SYMBOLS, base: 18245.32 },
  { name: 'S&P 500', symbols: SP500_SYMBOLS, base: 5021.84 },
  { name: 'DOW 30', symbols: DOW_SYMBOLS, base: 38654.42 },
  { name: 'Russell 2000', symbols: RUSSELL_SYMBOLS, base: 2048.67 },
  { name: 'SOX (반도체)', symbols: SOX_SYMBOLS, base: 4825.31 },

  // 유럽 / European
  { name: 'DAX (독일)', symbols: DAX_PROXY, base: 18205.64 },
  { name: 'FTSE 100', symbols: FTSE_PROXY, base: 7735.72 },
  { name: 'CAC 40', symbols: CAC_PROXY, base: 7952.18 },
  { name: 'EURO STOXX 50', symbols: EUROSTOXX_PROXY, base: 4948.35 },

  // 아시아 / Asian
  { name: 'Nikkei 225', symbols: NIKKEI_PROXY, base: 39245.17 },
  { name: 'Hang Seng', symbols: HANGSENG_PROXY, base: 16825.27 },
  { name: 'Shanghai', symbols: SHANGHAI_PROXY, base: 3052.44 },

  // 암호화폐 / Crypto
  { name: 'Crypto Total', symbols: CRYPTO_ALL, base: 2156780000000, format: 'marketcap' },
  { name: 'BTC Dominance', symbols: ['BTC-USD'], base: 52.4, format: 'percent' },
  { name: 'DeFi Index', symbols: DEFI_SYMBOLS, base: 125.80 },
  { name: 'Altcoin Index', symbols: ALTCOIN_SYMBOLS, base: 1842.56 },
  { name: 'Meme Index', symbols: MEME_SYMBOLS, base: 48.72 },
  { name: 'L1 Index', symbols: L1_SYMBOLS, base: 312.65 },

  // 원자재·변동성 / Commodities & Volatility
  { name: 'Gold', symbols: GOLD_PROXY, base: 2348.50 },
  { name: 'WTI 원유', symbols: OIL_PROXY, base: 78.32 },
  { name: 'VIX', symbols: VIX_PROXY, base: 14.23, format: 'vix' },
];

/* ─── 유틸 / Utilities ─── */

function computeIndex(assets: Asset[], def: IndexDef): IndexData {
  const matched = assets.filter((a) => def.symbols.includes(a.symbol));
  if (matched.length === 0) {
    return { name: def.name, value: def.base, changePercent: 0, sparkline: [], format: def.format };
  }
  const avgChange = matched.reduce((s, a) => s + a.changePercent, 0) / matched.length;
  const value = def.base * (1 + avgChange / 100);
  const sparkline = generateSparkline(avgChange, 20);
  return { name: def.name, value, changePercent: avgChange, sparkline, format: def.format };
}

function computeFromAssets(matched: Asset[], name: string, base: number, format?: IndexData['format']): IndexData {
  if (matched.length === 0) {
    return { name, value: base, changePercent: 0, sparkline: [], format };
  }
  const avgChange = matched.reduce((s, a) => s + a.changePercent, 0) / matched.length;
  const value = base * (1 + avgChange / 100);
  const sparkline = generateSparkline(avgChange, 20);
  return { name, value, changePercent: avgChange, sparkline, format };
}

function generateSparkline(trend: number, points: number): number[] {
  const data: number[] = [];
  let val = 100;
  const step = trend / points;
  for (let i = 0; i < points; i++) {
    val += step + (Math.random() - 0.5) * 0.3;
    data.push(val);
  }
  return data;
}

function formatIndexValue(idx: IndexData): string {
  switch (idx.format) {
    case 'marketcap':
      return `$${(idx.value / 1e12).toFixed(2)}T`;
    case 'percent':
      return `${idx.value.toFixed(1)}%`;
    case 'vix':
      return idx.value.toFixed(2);
    case 'krw':
      return formatCompactPrice(idx.value);
    default:
      return `$${formatCompactPrice(idx.value)}`;
  }
}

/* ─── 미니 스파크라인 / Mini Sparkline ─── */

function MiniSparkline({ data, isRise }: { data: number[]; isRise: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = isRise ? '#F04452' : '#3182F6';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((data[i] - min) / range) * h * 0.8 - h * 0.1;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [data, isRise]);

  return (
    <canvas
      ref={canvasRef}
      className="w-[50px] h-[24px]"
      style={{ width: 50, height: 24 }}
    />
  );
}

/* ─── 메인 컴포넌트 / Main Component ─── */

export default function MarketIndexSummary({ assets }: MarketIndexSummaryProps) {
  const indices = useMemo((): IndexData[] => {
    if (assets.length === 0) return [];

    const result: IndexData[] = [];

    // 정의된 지수들 계산 / Compute defined indices
    for (const def of INDEX_DEFS) {
      result.push(computeIndex(assets, def));
    }

    // 동적으로 한국 주식이 있으면 해당 지수 활성화 / Dynamically activate KR indices
    const krStocks = assets.filter((a) => a.type === 'STOCK' && a.symbol.endsWith('.KS'));
    if (krStocks.length > 0) {
      // KOSPI/KOSDAQ/KRX 300은 이미 symbol 기반으로 계산됨
      // 추가로 동적 그룹이 필요하면 여기서 추가
      const krLargeCap = krStocks.slice(0, Math.ceil(krStocks.length * 0.6));
      const krSmallCap = krStocks.slice(Math.ceil(krStocks.length * 0.6));
      if (krSmallCap.length > 0) {
        result.push(computeFromAssets(krSmallCap, 'KOSDAQ 150', 1248.36, 'krw'));
      }
      result.push(computeFromAssets(krLargeCap, 'KOSPI 200', 352.78, 'krw'));
    }

    // 0% 변동(매칭 없음) 지수 제거 / Remove indices with no matching assets
    return result.filter((idx) => idx.sparkline.length > 0);
  }, [assets]);

  if (indices.length === 0) return null;

  // 2배 복제로 무한 루프 마키 구현 / Duplicate for seamless infinite marquee
  const doubled = [...indices, ...indices];

  return (
    <div className="relative overflow-hidden py-4 border-b border-border marquee-pause-on-hover">
      {/* 좌우 그라데이션 마스크 / Left-right gradient masks */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />

      <div className="animate-marquee-index">
        {doubled.map((idx, i) => {
          const isRise = idx.changePercent > 0;
          const isFall = idx.changePercent < 0;

          return (
            <div
              key={`idx-${i}`}
              className="flex items-center gap-2.5 shrink-0 mx-2 pl-3 pr-2 py-2 rounded-xl bg-bg-secondary/40 min-w-[170px]"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-text-quaternary font-medium mb-0.5 truncate">
                  {idx.name}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[13px] font-bold text-text-primary tabular-nums">
                    {formatIndexValue(idx)}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] font-semibold tabular-nums',
                      isRise && 'text-rise',
                      isFall && 'text-fall',
                      !isRise && !isFall && 'text-text-quaternary',
                    )}
                  >
                    {formatPercent(idx.changePercent)}
                  </span>
                </div>
              </div>
              <MiniSparkline data={idx.sparkline} isRise={isRise} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
