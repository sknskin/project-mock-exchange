/**
 * @file 마켓 인덱스 요약 (마키)
 * @description Yahoo Finance API 실제 데이터를 마키(좌측 자동 스크롤)로 보여줍니다
 *
 * @file Market Index Summary (Marquee)
 * @description Shows real global market indices from Yahoo Finance as a left-scrolling marquee
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn, formatCompactPrice, formatPercent } from '@/lib/format';
import { useSettingsStore } from '@/stores/settings';
import MarketIndexModal from './MarketIndexModal';

interface RealIndex {
  symbol: string;
  nameKo: string;
  nameEn: string;
  category: string;
  price: number;
  change: number;
  changePercent: number;
  sparkline: number[];
}

/* ─── 값 포맷 / Value formatting ─── */

/** 인덱스 유형별 값 포맷팅 (환율/금리/VIX/일반)
 * Format index value by type (FX/yield/VIX/general) */
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

/** 소형 스파크라인 차트 (Canvas)
 * Mini sparkline chart rendered on Canvas */
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
      aria-label="Sparkline chart"
    />
  );
}

/* ─── 메인 컴포넌트 / Main Component ─── */

/** 마켓 인덱스 마키 — 글로벌 시장 지수를 자동 스크롤로 표시
 * Market index marquee — auto-scrolling global market indices */
export default function MarketIndexSummary() {
  const locale = useSettingsStore((s) => s.locale);
  const [indices, setIndices] = useState<RealIndex[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // null = CSS 애니메이션 모드, number = 수동 모드 (현재 위치 px)
  // null = CSS animation mode, number = manual mode (current position in px)
  const posRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const rafRef = useRef<number>(0);
  const dragRef = useRef<{ startX: number; startPos: number } | null>(null);
  const lastXRef = useRef(0);
  const [_hovered, setHovered] = useState(false);
  // 드래그 감지 — 클릭 vs 드래그 구분 / Drag detection — distinguish click vs drag
  const didDragRef = useRef(false);

  // 실제 데이터 fetch / Fetch real data from API route
  const fetchIndices = useCallback(async () => {
    try {
      const res = await fetch('/api/market-indices');
      const data = await res.json();
      if (data.indices) {
        setIndices(data.indices);
        setUpdatedAt(data.updatedAt ?? null);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchIndices();
    const interval = setInterval(fetchIndices, 60_000);
    return () => clearInterval(interval);
  }, [fetchIndices]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchIndices();
    setRefreshing(false);
  }, [fetchIndices]);

  // ─── JS 기반 수동 스크롤 (CSS hover 규칙 없이) / JS-based manual scroll (no CSS hover rule) ─── //

  /** CSS 애니메이션 중지 + 현재 위치 캡처 → 수동 모드 전환
   * Stop CSS animation, capture current position → enter manual mode */
  const enterManualMode = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    if (posRef.current !== null) return; // 이미 수동 모드 / already manual
    const computed = getComputedStyle(track);
    const matrix = new DOMMatrix(computed.transform);
    const currentX = matrix.m41;
    posRef.current = isNaN(currentX) ? 0 : currentX;
    // CSS 애니메이션 완전 제거 (animation-play-state 충돌 방지)
    // Fully remove CSS animation (prevents animation-play-state conflicts)
    track.style.animationName = 'none';
    track.style.animationPlayState = '';
    track.style.transform = `translate3d(${posRef.current}px, 0, 0)`;
  }, []);

  /** 트랙 위치 갱신 (루프 범위 보정 포함)
   * Update track position (with loop wrapping) */
  const applyPosition = useCallback((pos: number) => {
    const track = trackRef.current;
    if (!track) return pos;
    const half = track.scrollWidth / 2;
    if (half <= 0) return pos;
    while (pos > 0) pos -= half;
    while (pos < -half) pos += half;
    posRef.current = pos;
    track.style.transform = `translate3d(${pos}px, 0, 0)`;
    return pos;
  }, []);

  /** CSS 애니메이션으로 복원 (현재 위치에서 이어서)
   * Restore CSS animation (resuming from current position) */
  const restoreCSS = useCallback(() => {
    const track = trackRef.current;
    if (!track || posRef.current === null) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    dragRef.current = null;
    velocityRef.current = 0;

    const half = track.scrollWidth / 2;
    const progress = half > 0 ? -posRef.current / half : 0;
    const offset = progress * 180; // 180s = animation duration

    posRef.current = null;
    track.style.transform = '';
    track.style.animationName = '';
    track.style.animationPlayState = '';
    track.style.animationDelay = `-${offset}s`;
  }, []);

  /** 관성 스크롤 (감속 후 CSS 복원)
   * Inertia scroll (decelerate then restore CSS) */
  const animateInertia = useCallback(() => {
    if (posRef.current === null) return;
    velocityRef.current *= 0.93;
    if (Math.abs(velocityRef.current) > 0.3) {
      applyPosition(posRef.current + velocityRef.current);
      rafRef.current = requestAnimationFrame(animateInertia);
    } else {
      // 관성 종료 → 호버 중이면 정지, 아니면 CSS 복원
      // Inertia done → stay paused if hovered, else restore CSS
      velocityRef.current = 0;
    }
  }, [applyPosition]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 마우스 진입 → 수동 모드 + 부드러운 감속 정지 (~1.5초)
    // Mouse enter → manual mode + smooth deceleration to stop (~1.5s)
    const onMouseEnter = () => {
      setHovered(true);
      enterManualMode();
      const track = trackRef.current;
      if (track && posRef.current !== null) {
        const half = track.scrollWidth / 2;
        // 180s 동안 half px 이동 → 프레임당 속도 (60fps 기준)
        // Moves half px in 180s → per-frame velocity (at 60fps)
        velocityRef.current = -(half / 180 / 60);
        cancelAnimationFrame(rafRef.current);
        // 호버 전용 부드러운 감속 (0.98 = ~1.5초에 걸쳐 정지)
        // Hover-specific gentle deceleration (0.98 = stops over ~1.5s)
        const hoverDecel = () => {
          if (posRef.current === null) return;
          velocityRef.current *= 0.98;
          if (Math.abs(velocityRef.current) > 0.05) {
            applyPosition(posRef.current + velocityRef.current);
            rafRef.current = requestAnimationFrame(hoverDecel);
          } else {
            velocityRef.current = 0;
          }
        };
        rafRef.current = requestAnimationFrame(hoverDecel);
      }
    };

    // 마우스 이탈 → CSS 애니메이션 복원 (드래그 중이면 무시)
    // Mouse leave → restore CSS (skip if dragging)
    const onMouseLeave = () => {
      setHovered(false);
      dragRef.current = null;
      // 관성이 있으면 관성 후 복원, 없으면 즉시 복원
      if (Math.abs(velocityRef.current) > 1) {
        rafRef.current = requestAnimationFrame(animateInertia);
        // 관성 끝나면 자동 복원
        const checkDone = () => {
          if (Math.abs(velocityRef.current) <= 0.3) {
            restoreCSS();
          } else {
            requestAnimationFrame(checkDone);
          }
        };
        requestAnimationFrame(checkDone);
      } else {
        restoreCSS();
      }
    };

    // 휠 스크롤
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      enterManualMode();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (posRef.current !== null) {
        applyPosition(posRef.current - delta * 1.5);
      }
      velocityRef.current = -delta * 0.4;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(animateInertia);
    };

    // 드래그 시작 / Drag start
    const onPointerDown = (e: PointerEvent) => {
      enterManualMode();
      cancelAnimationFrame(rafRef.current);
      velocityRef.current = 0;
      lastXRef.current = e.clientX;
      dragRef.current = { startX: e.clientX, startPos: posRef.current ?? 0 };
      didDragRef.current = false;
      container.setPointerCapture(e.pointerId);
    };

    // 드래그 중 / Drag move
    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      if (Math.abs(dx) > 3) didDragRef.current = true;
      velocityRef.current = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      applyPosition(dragRef.current.startPos + dx);
    };

    // 드래그 종료 / Drag end
    const onPointerUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      if (Math.abs(velocityRef.current) > 1) {
        rafRef.current = requestAnimationFrame(animateInertia);
      }
    };

    container.addEventListener('mouseenter', onMouseEnter);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    return () => {
      container.removeEventListener('mouseenter', onMouseEnter);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [enterManualMode, applyPosition, restoreCSS, animateInertia]);

  // 클릭 핸들러 — 드래그가 아니었으면 모달 열기 / Click handler — open modal if not dragged
  const handleClick = useCallback(() => {
    if (!didDragRef.current) {
      setModalOpen(true);
    }
  }, []);

  if (indices.length === 0) return null;

  const doubled = [...indices, ...indices];

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="relative overflow-hidden py-4 border-b border-border cursor-pointer"
    >
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

      {modalOpen && createPortal(
        <div onClick={(e) => e.stopPropagation()}>
          <MarketIndexModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            indices={indices}
            updatedAt={updatedAt}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
