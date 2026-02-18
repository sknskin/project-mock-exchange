/**
 * @file 마켓 인덱스 요약
 * @description 전체 시장의 등락 비율과 주요 지표를 요약합니다
 *
 * @file Market Index Summary
 * @description Summarizes overall market rise/fall ratio and key indicators
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
}

function computeIndex(
  assets: Asset[],
  symbols: string[],
  baseName: string,
  baseValue: number,
): IndexData {
  const matched = assets.filter((a) => symbols.includes(a.symbol));
  if (matched.length === 0) {
    return { name: baseName, value: baseValue, changePercent: 0, sparkline: [] };
  }
  const avgChange = matched.reduce((s, a) => s + a.changePercent, 0) / matched.length;
  const value = baseValue * (1 + avgChange / 100);
  // Generate sparkline from matched assets' individual changes
  const sparkline = generateSparkline(avgChange, 20);
  return { name: baseName, value, changePercent: avgChange, sparkline };
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
      className="w-[60px] h-[28px]"
      style={{ width: 60, height: 28 }}
    />
  );
}

const NASDAQ_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX', 'AMD', 'INTC'];
const SP500_SYMBOLS = ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'JPM', 'V', 'WMT', 'DIS', 'BA', 'NKE', 'CRM'];
const KOSPI_CRYPTO = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'ADA-USD', 'DOT-USD'];
const CRYPTO_INDEX = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD', 'ADA-USD', 'AVAX-USD', 'LINK-USD'];

export default function MarketIndexSummary({ assets }: MarketIndexSummaryProps) {
  const indices = useMemo((): IndexData[] => {
    if (assets.length === 0) return [];
    return [
      computeIndex(assets, NASDAQ_SYMBOLS, 'NASDAQ 100', 18245.32),
      computeIndex(assets, SP500_SYMBOLS, 'S&P 500', 5021.84),
      computeIndex(assets, KOSPI_CRYPTO, 'Crypto Total', 2156780000000),
      computeIndex(assets, CRYPTO_INDEX, 'BTC Dominance', 52.4),
    ];
  }, [assets]);

  if (indices.length === 0) return null;

  return (
    <div className="py-4 border-b border-border">
      <div className="flex gap-4 lg:gap-6 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {indices.map((idx) => {
          const isRise = idx.changePercent > 0;
          const isFall = idx.changePercent < 0;

          return (
            <div
              key={idx.name}
              className="flex items-center gap-3 shrink-0 px-3 py-2.5 rounded-xl bg-bg-secondary/40 min-w-[200px]"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-text-quaternary font-medium mb-0.5">
                  {idx.name}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[14px] font-bold text-text-primary tabular-nums">
                    {idx.name === 'Crypto Total'
                      ? `$${(idx.value / 1e12).toFixed(2)}T`
                      : idx.name === 'BTC Dominance'
                        ? `${idx.value.toFixed(1)}%`
                        : formatCompactPrice(idx.value)}
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
