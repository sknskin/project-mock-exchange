/**
 * @file 캔들스틱 차트 컴포넌트
 * @description lightweight-charts 기반 OHLCV 캔들스틱/라인 차트 + 볼륨 히스토그램
 *
 * @file Candlestick Chart Component
 * @description OHLCV candlestick/line chart with volume histogram based on lightweight-charts
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type { Candlestick } from '@/types';
import { cn } from '@/lib/format';

const intervals = [
  { key: '1m', label: '1분' },
  { key: '5m', label: '5분' },
  { key: '15m', label: '15분' },
  { key: '1h', label: '1시간' },
  { key: '1d', label: '1일' },
];

interface CandlestickChartProps {
  data: Candlestick[];
  interval: string;
  onIntervalChange: (interval: string) => void;
}

export default function CandlestickChart({
  data,
  interval,
  onIntervalChange,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6B7683',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 380,
      crosshair: {
        vertLine: { color: 'rgba(255,255,255,0.1)', labelBackgroundColor: '#2A2A32' },
        horzLine: { color: 'rgba(255,255,255,0.1)', labelBackgroundColor: '#2A2A32' },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
      },
    });

    const sortedData = [...data].sort((a, b) => a.time - b.time);

    if (chartType === 'candle') {
      const candleSeries = chart.addCandlestickSeries({
        upColor: '#F04452',
        downColor: '#3182F6',
        borderUpColor: '#F04452',
        borderDownColor: '#3182F6',
        wickUpColor: '#F04452',
        wickDownColor: '#3182F6',
      });

      candleSeries.setData(
        sortedData.map((d) => ({
          time: (d.time / 1000) as import('lightweight-charts').UTCTimestamp,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        })),
      );
    } else {
      const lineSeries = chart.addLineSeries({
        color: '#3182F6',
        lineWidth: 2,
      });

      lineSeries.setData(
        sortedData.map((d) => ({
          time: (d.time / 1000) as import('lightweight-charts').UTCTimestamp,
          value: d.close,
        })),
      );
    }

    // Volume histogram
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volumeSeries.setData(
      sortedData.map((d) => ({
        time: (d.time / 1000) as import('lightweight-charts').UTCTimestamp,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(240,68,82,0.3)' : 'rgba(49,130,246,0.3)',
      })),
    );

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, chartType]);

  return (
    <div>
      {/* 시간대 선택 + 차트 타입 토글 / Interval selector + Chart type toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {intervals.map((i) => (
            <button
              key={i.key}
              onClick={() => onIntervalChange(i.key)}
              className={cn(
                'px-2.5 py-1 text-[12px] rounded-md transition-colors',
                interval === i.key
                  ? 'bg-bg-tertiary text-text-primary font-semibold'
                  : 'text-text-quaternary hover:text-text-tertiary',
              )}
            >
              {i.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setChartType('candle')}
            className={cn(
              'px-2.5 py-1 text-[12px] rounded-md transition-colors',
              chartType === 'candle'
                ? 'bg-bg-tertiary text-text-primary font-semibold'
                : 'text-text-quaternary hover:text-text-tertiary',
            )}
          >
            캔들
          </button>
          <button
            onClick={() => setChartType('line')}
            className={cn(
              'px-2.5 py-1 text-[12px] rounded-md transition-colors',
              chartType === 'line'
                ? 'bg-bg-tertiary text-text-primary font-semibold'
                : 'text-text-quaternary hover:text-text-tertiary',
            )}
          >
            라인
          </button>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
