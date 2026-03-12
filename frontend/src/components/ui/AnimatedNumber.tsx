/**
 * @file 숫자 슬롯 애니메이션 컴포넌트
 * @description 각 자릿수가 위/아래로 부드럽게 전환되는 오도미터(슬롯머신) 효과
 *
 * @file Animated Number Component
 * @description Odometer/slot-machine effect where each digit smoothly slides up/down on value change
 */
'use client';

import { memo, useEffect, useRef, useState } from 'react';

const DURATION = 400; // ms

/** 단일 자릿수 슬롯 — CSS transition 기반 부드러운 슬라이드
 * Single digit slot — smooth slide via CSS transitions */
function Digit({ char, direction }: { char: string; direction: 'up' | 'down' | 'none' }) {
  const [display, setDisplay] = useState({ current: char, previous: char });
  const [phase, setPhase] = useState<'idle' | 'animating'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  // 애니메이션 중 도착한 최신 값을 버퍼링 / Buffer latest value arriving mid-animation
  const pendingRef = useRef<string | null>(null);

  useEffect(() => {
    if (char === display.current) {
      pendingRef.current = null;
      return;
    }
    // 애니메이션 진행 중이면 버퍼에만 저장하고 리턴 — state 변경 없이 key 유지
    // During animation, buffer only — no state change keeps key stable
    if (phase === 'animating') {
      pendingRef.current = char;
      return;
    }
    pendingRef.current = null;
    setDisplay((prev) => ({ previous: prev.current, current: char }));
    setPhase('animating');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setPhase('idle'), DURATION);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [char, display.current, phase]);

  // 애니메이션 종료 시 버퍼된 값으로 즉시 전환 (애니메이션 없이)
  // On animation end, snap to buffered value (no animation)
  useEffect(() => {
    if (phase === 'idle' && pendingRef.current !== null && pendingRef.current !== display.current) {
      const p = pendingRef.current;
      pendingRef.current = null;
      setDisplay({ current: p, previous: p });
    }
  }, [phase, display.current]);

  // 숫자가 아닌 문자(콤마, 점, 통화기호 등)는 애니메이션 없이 렌더
  // Non-digit chars (comma, dot, currency symbols) render without animation
  if (!/\d/.test(char)) {
    return <span className="inline-block">{char}</span>;
  }

  const isUp = direction === 'up';
  const animating = phase === 'animating';

  return (
    <span
      className="inline-block relative overflow-hidden"
      style={{ width: '0.6em', height: '1.15em', verticalAlign: 'bottom' }}
    >
      {/* 현재 값 — 슬라이드 인 / Current value — slides in */}
      <span
        className="absolute inset-x-0 text-center will-change-transform"
        style={{
          transition: animating
            ? `transform ${DURATION}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${DURATION}ms ease-out`
            : 'none',
          transform: 'translateY(0)',
          opacity: 1,
        }}
        key={`cur-${display.current}-${display.previous}`}
        ref={(el) => {
          if (el && animating) {
            el.style.transition = 'none';
            el.style.transform = isUp ? 'translateY(100%)' : 'translateY(-100%)';
            el.style.opacity = '0';
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                el.style.transition = `transform ${DURATION}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${DURATION * 0.6}ms ease-out`;
                el.style.transform = 'translateY(0)';
                el.style.opacity = '1';
              });
            });
          }
        }}
      >
        {display.current}
      </span>

      {/* 이전 값 — 슬라이드 아웃 / Previous value — slides out */}
      {animating && (
        <span
          className="absolute inset-x-0 text-center will-change-transform"
          ref={(el) => {
            if (el) {
              el.style.transition = 'none';
              el.style.transform = 'translateY(0)';
              el.style.opacity = '1';
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  el.style.transition = `transform ${DURATION}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${DURATION * 0.6}ms ease-in`;
                  el.style.transform = isUp ? 'translateY(-100%)' : 'translateY(100%)';
                  el.style.opacity = '0';
                });
              });
            }
          }}
        >
          {display.previous}
        </span>
      )}

      {/* 비-애니메이션 상태에서 표시 / Shown when not animating */}
      {!animating && (
        <span className="absolute inset-x-0 text-center">
          {display.current}
        </span>
      )}
    </span>
  );
}

interface AnimatedNumberProps {
  /** 포맷팅된 숫자 문자열 (예: "$1,234.56", "+12.3%")
   * Formatted number string (e.g. "$1,234.56", "+12.3%") */
  value: string;
  /** 추가 CSS 클래스 / Additional CSS classes */
  className?: string;
}

/**
 * 포맷팅된 숫자 문자열의 각 자릿수를 슬롯머신 스타일로 애니메이션하는 컴포넌트
 * Animates each digit of a formatted number string with slot-machine style transitions
 */
function AnimatedNumberInner({ value, className }: AnimatedNumberProps) {
  const prevValueRef = useRef(value);
  const prevValue = prevValueRef.current;

  // 숫자 크기 비교로 방향 결정 / Determine direction by comparing numeric values
  const direction = (() => {
    const numCur = parseFloat(value.replace(/[^0-9.-]/g, ''));
    const numPrev = parseFloat(prevValue.replace(/[^0-9.-]/g, ''));
    if (isNaN(numCur) || isNaN(numPrev) || numCur === numPrev) return 'none' as const;
    return numCur > numPrev ? 'up' as const : 'down' as const;
  })();

  useEffect(() => {
    prevValueRef.current = value;
  }, [value]);

  const chars = value.split('');

  return (
    <span className={`inline-flex tabular-nums ${className ?? ''}`} aria-label={value}>
      {chars.map((char, i) => (
        <Digit key={`${i}-${chars.length}`} char={char} direction={direction} />
      ))}
    </span>
  );
}

export default memo(AnimatedNumberInner);
