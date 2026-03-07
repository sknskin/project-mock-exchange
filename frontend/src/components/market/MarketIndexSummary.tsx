/**
 * @file 마켓 인덱스 요약 (마키)
 * @description Yahoo Finance API 실제 데이터를 마키(좌측 자동 스크롤)로 보여줍니다
 *
 * @file Market Index Summary (Marquee)
 * @description Shows real global market indices from Yahoo Finance as a left-scrolling marquee
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn, formatCompactPrice, formatPercent } from '@/lib/format';
import { useSettingsStore } from '@/stores/settings';

interface RealIndex {
  symbol: string;
  nameKo: string;
  nameEn: string;
  price: number;
  change: number;
  changePercent: number;
  sparkline: number[];
}

/* ─── 값 포맷 / Value formatting ─── */

function formatIndexValue(idx: RealIndex): string {
  const s = idx.symbol;
  // 환율
  if (s.includes('=X') || s.includes('JPY')) {
    return idx.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // 채권 금리
  if (s === '^TNX' || s === '^TYX') {
    return `${idx.price.toFixed(3)}%`;
  }
  // VIX
  if (s === '^VIX') {
    return idx.price.toFixed(2);
  }
  // 일반 지수/가격
  return formatCompactPrice(idx.price);
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

export default function MarketIndexSummary() {
  const locale = useSettingsStore((s) => s.locale);
  const [indices, setIndices] = useState<RealIndex[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const rafRef = useRef<number>(0);

  // 실제 데이터 fetch / Fetch real data from API route
  useEffect(() => {
    let mounted = true;
    const load = () => {
      fetch('/api/market-indices')
        .then((r) => r.json())
        .then((data) => { if (mounted && data.indices) setIndices(data.indices); })
        .catch(() => {});
    };
    load();
    // 60초마다 갱신 / Refresh every 60s
    const interval = setInterval(load, 60_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // ─── 휠 스크롤 로직 / Wheel scroll logic ─── //

  const enterManualMode = useCallback(() => {
    const track = trackRef.current;
    if (!track || posRef.current !== null) return;
    const computed = getComputedStyle(track);
    const matrix = new DOMMatrix(computed.transform);
    posRef.current = matrix.m41;
    track.style.animation = 'none';
    track.style.transform = `translate3d(${posRef.current}px, 0, 0)`;
  }, []);

  const animateInertia = useCallback(() => {
    const track = trackRef.current;
    if (!track || posRef.current === null) return;

    const totalWidth = track.scrollWidth / 2;
    velocityRef.current *= 0.92;

    if (Math.abs(velocityRef.current) > 0.2) {
      posRef.current += velocityRef.current;
      if (posRef.current > 0) posRef.current -= totalWidth;
      if (posRef.current < -totalWidth) posRef.current += totalWidth;
      track.style.transform = `translate3d(${posRef.current}px, 0, 0)`;
      rafRef.current = requestAnimationFrame(animateInertia);
    }
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    const track = trackRef.current;
    if (!track) return;
    e.preventDefault();

    enterManualMode();

    const totalWidth = track.scrollWidth / 2;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    velocityRef.current -= delta * 0.8;

    posRef.current! += velocityRef.current * 0.15;
    if (posRef.current! > 0) posRef.current! -= totalWidth;
    if (posRef.current! < -totalWidth) posRef.current! += totalWidth;
    track.style.transform = `translate3d(${posRef.current}px, 0, 0)`;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animateInertia);
  }, [enterManualMode, animateInertia]);

  const handleMouseLeave = useCallback(() => {
    const track = trackRef.current;
    if (!track || posRef.current === null) return;
    cancelAnimationFrame(rafRef.current);
    velocityRef.current = 0;

    const totalWidth = track.scrollWidth / 2;
    const progress = -posRef.current / totalWidth;
    const duration = 120;
    const offset = progress * duration;

    posRef.current = null;
    track.style.transform = '';
    track.style.animation = '';
    track.style.animationDelay = `-${offset}s`;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleWheel, handleMouseLeave]);

  if (indices.length === 0) return null;

  const doubled = [...indices, ...indices];

  return (
    <div ref={containerRef} className="relative overflow-hidden py-4 border-b border-border marquee-pause-on-hover">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />

      <div ref={trackRef} className="animate-marquee-index">
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
                  {locale === 'en' ? idx.nameEn : idx.nameKo}
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
              {idx.sparkline.length >= 2 && (
                <MiniSparkline data={idx.sparkline} isRise={isRise} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
