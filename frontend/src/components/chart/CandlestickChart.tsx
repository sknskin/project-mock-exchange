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
        textColor: '#8B949E',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#21262D' },
        horzLines: { color: '#21262D' },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      crosshair: {
        vertLine: { color: '#30363D', labelBackgroundColor: '#161B22' },
        horzLine: { color: '#30363D', labelBackgroundColor: '#161B22' },
      },
      timeScale: {
        borderColor: '#30363D',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: '#30363D',
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#FF3B30',
      downColor: '#007AFF',
      borderUpColor: '#FF3B30',
      borderDownColor: '#007AFF',
      wickUpColor: '#FF3B30',
      wickDownColor: '#007AFF',
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
