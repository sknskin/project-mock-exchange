/**
 * @file 캔들스틱 차트 컴포넌트
 * @description lightweight-charts 기반 OHLCV 캔들스틱/라인 차트 + 볼륨 히스토그램
 *
 * @file Candlestick Chart Component
 * @description OHLCV candlestick/line chart with volume histogram based on lightweight-charts
 */
'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type { Candlestick } from '@/types';

interface CandlestickChartProps {
  data: Candlestick[];
  chartType: 'candle' | 'line';
}

export default function CandlestickChart({
  data,
  chartType,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

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

    // Remove TradingView attribution logo
    const links = chartContainerRef.current.querySelectorAll('a');
    links.forEach((a) => (a.style.display = 'none'));

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

  return <div ref={chartContainerRef} className="w-full overflow-hidden" />;
}
