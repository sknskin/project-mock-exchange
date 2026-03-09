/**
 * @file 캔들스틱 차트 컴포넌트 (기술적 지표 포함)
 * @description lightweight-charts 기반 OHLCV 캔들스틱/라인 차트 + 볼륨 히스토그램
 *              + SMA(5/20/60), RSI(14), 볼린저 밴드 기술적 지표 오버레이
 *
 * @file Candlestick Chart Component (with Technical Indicators)
 * @description OHLCV candlestick/line chart with volume histogram based on lightweight-charts
 *              + SMA(5/20/60), RSI(14), Bollinger Bands technical indicator overlays
 */
'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  UTCTimestamp,
} from 'lightweight-charts';
import { useTranslation } from '@/hooks/useTranslation';
import {
  calculateSMA,
  calculateRSI,
  calculateBollingerBands,
} from '@/lib/indicators';
import type { IndicatorPoint } from '@/lib/indicators';
import type { Candlestick } from '@/types';
import type { TranslationKey } from '@/lib/i18n';

/* ---------- 지표 설정 (Indicator Config) ---------- */

interface IndicatorConfig {
  key: string;
  labelKey: TranslationKey;
  color: string;
  defaultOn: boolean;
}

const SMA_INDICATORS: IndicatorConfig[] = [
  { key: 'sma5', labelKey: 'chart.ind.sma5', color: '#F59E0B', defaultOn: true },
  { key: 'sma20', labelKey: 'chart.ind.sma20', color: '#3B82F6', defaultOn: true },
  { key: 'sma60', labelKey: 'chart.ind.sma60', color: '#A855F7', defaultOn: true },
];

const VOLUME_INDICATOR: IndicatorConfig = {
  key: 'volume', labelKey: 'chart.ind.volume', color: '#6B7683', defaultOn: true,
};

const RSI_INDICATOR: IndicatorConfig = {
  key: 'rsi', labelKey: 'chart.ind.rsi', color: '#F97316', defaultOn: true,
};

const BB_INDICATOR: IndicatorConfig = {
  key: 'bb', labelKey: 'chart.ind.bb', color: '#14B8A6', defaultOn: true,
};

const ALL_INDICATORS: IndicatorConfig[] = [
  ...SMA_INDICATORS,
  VOLUME_INDICATOR,
  RSI_INDICATOR,
  BB_INDICATOR,
];

/* ---------- Props ---------- */

interface CandlestickChartProps {
  data: Candlestick[];
  chartType: 'candle' | 'line';
  exchangeRate?: number;
  interval?: string;
}

/* ---------- 유틸 (Util) ---------- */

function buildDefaultToggles(): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const ind of ALL_INDICATORS) {
    m[ind.key] = ind.defaultOn;
  }
  return m;
}

/* ---------- Component ---------- */

/** 캔들스틱 차트 — lightweight-charts 기반 OHLC + 보조지표 렌더링
 * Candlestick chart — renders OHLC + indicators using lightweight-charts */
export default function CandlestickChart({
  data,
  chartType,
  exchangeRate,
  interval,
}: CandlestickChartProps) {
  const { t } = useTranslation();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const smaSeriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const currentTypeRef = useRef<'candle' | 'line'>(chartType);
  const isFirstRenderRef = useRef(true);

  const [toggles, setToggles] = useState<Record<string, boolean>>(buildDefaultToggles);

  const handleToggle = useCallback((key: string) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // 종가 데이터를 한번만 계산 (Memoize close data for indicators)
  const closesData = useMemo(() => {
    if (data.length === 0) return [];
    const sorted = [...data].sort((a, b) => a.time - b.time);
    const r = exchangeRate ?? 1;
    return sorted.map((d): IndicatorPoint => ({
      time: (d.time / 1000) as UTCTimestamp,
      value: d.close * r,
    }));
  }, [data, exchangeRate]);

  /* ========== 이펙트 1: 메인 차트 생성 (Effect 1: Main chart creation) ========== */
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

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (chartContainerRef.current) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
      smaSeriesRefs.current.clear();
      bbUpperRef.current = null;
      bbMiddleRef.current = null;
      bbLowerRef.current = null;
      chart.remove();
    };
  }, []);

  /* ========== 이펙트 2: RSI 차트 생성/제거 (Effect 2: RSI chart create/destroy) ========== */
  useEffect(() => {
    if (!toggles.rsi) {
      // RSI off → 차트 제거 (RSI off: remove chart)
      if (rsiChartRef.current) {
        rsiSeriesRef.current = null;
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
      }
      return;
    }

    if (!rsiContainerRef.current) return;

    const rsiChart = createChart(rsiContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6B7683',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      width: rsiContainerRef.current.clientWidth,
      height: 120,
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
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
    });

    rsiChartRef.current = rsiChart;

    // TradingView 귀속 로고 제거 (Remove TradingView attribution logo)
    const links = rsiContainerRef.current.querySelectorAll('a');
    links.forEach((a) => (a.style.display = 'none'));

    // RSI 시리즈 (RSI series)
    const rsiSeries = rsiChart.addLineSeries({
      color: RSI_INDICATOR.color,
      lineWidth: 1,
      priceFormat: { type: 'custom', formatter: (v: number) => v.toFixed(1) },
    });
    rsiSeriesRef.current = rsiSeries;

    // 과매수/과매도 라인 (Overbought/Oversold lines)
    rsiSeries.createPriceLine({
      price: 70,
      color: 'rgba(240,68,82,0.4)',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: '70',
    });
    rsiSeries.createPriceLine({
      price: 30,
      color: 'rgba(49,130,246,0.4)',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '30',
    });

    // RSI 데이터 세팅 (Set RSI data)
    if (closesData.length > 0) {
      const rsiData = calculateRSI(closesData, 14);
      rsiSeries.setData(rsiData.map((d) => ({ time: d.time, value: d.value })));
      rsiChart.timeScale().fitContent();
    }

    const handleResize = () => {
      if (rsiContainerRef.current) {
        rsiChart.applyOptions({ width: rsiContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    // 메인 차트와 시간축 동기화 (Sync time scale with main chart)
    const mainChart = chartRef.current;
    if (mainChart) {
      const syncFromMain = () => {
        const logicalRange = mainChart.timeScale().getVisibleLogicalRange();
        if (logicalRange) {
          rsiChart.timeScale().setVisibleLogicalRange(logicalRange);
        }
      };
      const syncFromRsi = () => {
        const logicalRange = rsiChart.timeScale().getVisibleLogicalRange();
        if (logicalRange) {
          mainChart.timeScale().setVisibleLogicalRange(logicalRange);
        }
      };
      mainChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromMain);
      rsiChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromRsi);

      // 초기 동기화 (Initial sync)
      syncFromMain();

      return () => {
        window.removeEventListener('resize', handleResize);
        mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromMain);
        rsiChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromRsi);
        rsiSeriesRef.current = null;
        rsiChartRef.current = null;
        rsiChart.remove();
      };
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      rsiSeriesRef.current = null;
      rsiChartRef.current = null;
      rsiChart.remove();
    };
  }, [toggles.rsi, closesData]);

  /* ========== 이펙트 3: 시리즈 타입 변경 (Effect 3: Series type change) ========== */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // 기존 시리즈 모두 제거 (Remove all existing series)
    if (mainSeriesRef.current) {
      chart.removeSeries(mainSeriesRef.current);
      mainSeriesRef.current = null;
    }
    if (volumeSeriesRef.current) {
      chart.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }
    for (const [, series] of smaSeriesRefs.current) {
      chart.removeSeries(series);
    }
    smaSeriesRefs.current.clear();
    if (bbUpperRef.current) { chart.removeSeries(bbUpperRef.current); bbUpperRef.current = null; }
    if (bbMiddleRef.current) { chart.removeSeries(bbMiddleRef.current); bbMiddleRef.current = null; }
    if (bbLowerRef.current) { chart.removeSeries(bbLowerRef.current); bbLowerRef.current = null; }

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

    // 볼륨 시리즈 생성 (Create volume series)
    volumeSeriesRef.current = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // SMA 시리즈 생성 (Create SMA series)
    for (const sma of SMA_INDICATORS) {
      const series = chart.addLineSeries({
        color: sma.color,
        lineWidth: 1,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      smaSeriesRefs.current.set(sma.key, series);
    }

    // 볼린저 밴드 시리즈 생성 (Create Bollinger Bands series)
    bbUpperRef.current = chart.addLineSeries({
      color: 'rgba(20,184,166,0.5)',
      lineWidth: 1,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    bbMiddleRef.current = chart.addLineSeries({
      color: 'rgba(20,184,166,0.8)',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    bbLowerRef.current = chart.addLineSeries({
      color: 'rgba(20,184,166,0.5)',
      lineWidth: 1,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    currentTypeRef.current = chartType;
    isFirstRenderRef.current = true;
  }, [chartType]);

  /* ========== 이펙트 4: 데이터 업데이트 (팬/줌 유지) (Effect 4: Data update, preserves pan/zoom) ========== */
  useEffect(() => {
    if (!mainSeriesRef.current || !volumeSeriesRef.current || data.length === 0) return;

    const sortedData = [...data].sort((a, b) => a.time - b.time);
    const r = exchangeRate ?? 1;

    // 메인 시리즈 데이터 (Main series data)
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

    // 볼륨 데이터 (Volume data)
    const volumeData: HistogramData[] = sortedData.map((d) => ({
      time: (d.time / 1000) as UTCTimestamp,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(240,68,82,0.3)' : 'rgba(49,130,246,0.3)',
    }));
    volumeSeriesRef.current.setData(volumeData);

    // SMA 데이터 (SMA data)
    const smaPeriods: Record<string, number> = { sma5: 5, sma20: 20, sma60: 60 };
    for (const [key, period] of Object.entries(smaPeriods)) {
      const series = smaSeriesRefs.current.get(key);
      if (series) {
        const smaData = calculateSMA(closesData, period);
        series.setData(smaData.map((d) => ({ time: d.time, value: d.value })));
      }
    }

    // 볼린저 밴드 데이터 (Bollinger Bands data)
    const bbData = calculateBollingerBands(closesData, 20, 2);
    if (bbUpperRef.current) {
      bbUpperRef.current.setData(bbData.map((d) => ({ time: d.time, value: d.upper })));
    }
    if (bbMiddleRef.current) {
      bbMiddleRef.current.setData(bbData.map((d) => ({ time: d.time, value: d.middle })));
    }
    if (bbLowerRef.current) {
      bbLowerRef.current.setData(bbData.map((d) => ({ time: d.time, value: d.lower })));
    }

    // RSI 데이터 업데이트 (Update RSI data)
    if (rsiSeriesRef.current && closesData.length > 0) {
      const rsiData = calculateRSI(closesData, 14);
      rsiSeriesRef.current.setData(rsiData.map((d) => ({ time: d.time, value: d.value })));
    }

    // 첫 렌더 또는 인터벌 변경 시 콘텐츠 맞춤 (fitContent on first render or interval change)
    if (isFirstRenderRef.current && chartRef.current) {
      chartRef.current.timeScale().fitContent();
      if (rsiChartRef.current) {
        rsiChartRef.current.timeScale().fitContent();
      }
      isFirstRenderRef.current = false;
    }
  }, [data, exchangeRate, chartType, closesData]);

  /* ========== 이펙트 5: 지표 토글 가시성 (Effect 5: Toggle indicator visibility) ========== */
  useEffect(() => {
    // 볼륨 (Volume)
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({
        visible: toggles.volume,
      });
    }

    // SMA
    for (const sma of SMA_INDICATORS) {
      const series = smaSeriesRefs.current.get(sma.key);
      if (series) {
        series.applyOptions({ visible: toggles[sma.key] });
      }
    }

    // 볼린저 밴드 (Bollinger Bands)
    if (bbUpperRef.current) bbUpperRef.current.applyOptions({ visible: toggles.bb });
    if (bbMiddleRef.current) bbMiddleRef.current.applyOptions({ visible: toggles.bb });
    if (bbLowerRef.current) bbLowerRef.current.applyOptions({ visible: toggles.bb });
  }, [toggles]);

  /* ========== 이펙트 6: 인터벌 변경 시 뷰 초기화 (Effect 6: Reset view on interval change) ========== */
  useEffect(() => {
    isFirstRenderRef.current = true;
  }, [interval]);

  /* ========== Render ========== */
  return (
    <div className="w-full">
      {/* 지표 토글 컨트롤 (Indicator Toggle Controls) */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {ALL_INDICATORS.map((ind) => (
          <button
            key={ind.key}
            onClick={() => handleToggle(ind.key)}
            className={
              'flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full border transition-all ' +
              (toggles[ind.key]
                ? 'border-transparent text-white font-semibold'
                : 'border-border/40 text-text-quaternary hover:text-text-tertiary hover:border-border/60')
            }
            style={
              toggles[ind.key]
                ? { backgroundColor: ind.color + '28', borderColor: ind.color + '60', color: ind.color }
                : undefined
            }
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: ind.color, opacity: toggles[ind.key] ? 1 : 0.35 }}
            />
            {t(ind.labelKey)}
          </button>
        ))}
      </div>

      {/* 메인 차트 (Main Chart) */}
      <div ref={chartContainerRef} className="w-full overflow-hidden" />

      {/* RSI 차트 (RSI Chart) */}
      {toggles.rsi && (
        <div className="mt-1">
          <div className="text-[10px] text-text-quaternary mb-1 pl-1">RSI (14)</div>
          <div ref={rsiContainerRef} className="w-full overflow-hidden" />
        </div>
      )}
    </div>
  );
}
