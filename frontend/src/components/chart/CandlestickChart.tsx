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
import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  UTCTimestamp,
} from 'lightweight-charts';
import type { Candlestick } from '@/types';

interface CandlestickChartProps {
  data: Candlestick[];
  chartType: 'candle' | 'line';
  exchangeRate?: number;
  interval?: string;
}

export default function CandlestickChart({
  data,
  chartType,
  exchangeRate,
  interval,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const currentTypeRef = useRef<'candle' | 'line'>(chartType);
  const isFirstRenderRef = useRef(true);

  // 이펙트 1: 차트 생성 (마운트 시에만) (Effect 1: Chart creation, mount only)
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

    chartRef.current = chart;
    isFirstRenderRef.current = true;

    // TradingView 귀속 로고 제거 (Remove TradingView attribution logo)
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
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
      chart.remove();
    };
  }, []);

  // 이펙트 2: 시리즈 타입 변경 (Effect 2: Series type change)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // 타입 변경 또는 첫 렌더 시 기존 시리즈 제거 (Remove existing series if type changed or first render)
    if (mainSeriesRef.current) {
      chart.removeSeries(mainSeriesRef.current);
      mainSeriesRef.current = null;
    }
    if (volumeSeriesRef.current) {
      chart.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }

    // 메인 시리즈 생성 (Create main series)
    if (chartType === 'candle') {
      mainSeriesRef.current = chart.addCandlestickSeries({
        upColor: '#F04452',
        downColor: '#3182F6',
        borderUpColor: '#F04452',
        borderDownColor: '#3182F6',
        wickUpColor: '#F04452',
        wickDownColor: '#3182F6',
      });
    } else {
      mainSeriesRef.current = chart.addLineSeries({
        color: '#3182F6',
        lineWidth: 2,
      });
    }

    // 거래량 시리즈 생성 (Create volume series)
    volumeSeriesRef.current = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    currentTypeRef.current = chartType;
    isFirstRenderRef.current = true;
  }, [chartType]);

  // 이펙트 3: 데이터 업데이트 (팬/줌 유지) (Effect 3: Data update, preserves pan/zoom)
  useEffect(() => {
    if (!mainSeriesRef.current || !volumeSeriesRef.current || data.length === 0) return;

    const sortedData = [...data].sort((a, b) => a.time - b.time);
    const r = exchangeRate ?? 1;

    if (currentTypeRef.current === 'candle') {
      const candleData: CandlestickData[] = sortedData.map((d) => ({
        time: (d.time / 1000) as UTCTimestamp,
        open: d.open * r,
        high: d.high * r,
        low: d.low * r,
        close: d.close * r,
      }));
      (mainSeriesRef.current as ISeriesApi<'Candlestick'>).setData(candleData);
    } else {
      const lineData: LineData[] = sortedData.map((d) => ({
        time: (d.time / 1000) as UTCTimestamp,
        value: d.close * r,
      }));
      (mainSeriesRef.current as ISeriesApi<'Line'>).setData(lineData);
    }

    const volumeData: HistogramData[] = sortedData.map((d) => ({
      time: (d.time / 1000) as UTCTimestamp,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(240,68,82,0.3)' : 'rgba(49,130,246,0.3)',
    }));
    volumeSeriesRef.current.setData(volumeData);

    // 첫 렌더 또는 인터벌 변경 시 콘텐츠 맞춤 (fitContent on first render or interval change)
    if (isFirstRenderRef.current && chartRef.current) {
      chartRef.current.timeScale().fitContent();
      isFirstRenderRef.current = false;
    }
  }, [data, exchangeRate, chartType]);

  // 이펙트 4: 인터벌 변경 시 뷰 초기화 (Effect 4: Reset view on interval change)
  useEffect(() => {
    isFirstRenderRef.current = true;
  }, [interval]);

  return <div ref={chartContainerRef} className="w-full overflow-hidden" />;
}
