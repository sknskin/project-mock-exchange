'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type { Candlestick } from '@/types';

interface CandlestickChartProps {
  data: Candlestick[];
  height?: number;
}

export default function CandlestickChart({
  data,
  height = 300,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

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
      height,
      crosshair: {
        vertLine: { color: 'rgba(255,255,255,0.1)', labelBackgroundColor: '#2A2A32' },
        horzLine: { color: 'rgba(255,255,255,0.1)', labelBackgroundColor: '#2A2A32' },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#F04452',
      downColor: '#3182F6',
      borderUpColor: '#F04452',
      borderDownColor: '#3182F6',
      wickUpColor: '#F04452',
      wickDownColor: '#3182F6',
    });

    const chartData = data.map((d) => ({
      time: (d.time / 1000) as import('lightweight-charts').UTCTimestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candlestickSeries.setData(chartData);
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
  }, [data, height]);

  return <div ref={chartContainerRef} className="w-full" />;
}
