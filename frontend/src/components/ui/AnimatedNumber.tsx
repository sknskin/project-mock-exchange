/**
 * @file 숫자 슬롯 애니메이션 컴포넌트
 * @description 각 자릿수가 위/아래로 슬라이드되며 전환되는 오도미터(슬롯머신) 효과
 *
 * @file Animated Number Component
 * @description Odometer/slot-machine effect where each digit slides up/down on value change
 */
'use client';

import { memo, useEffect, useRef, useState } from 'react';

/** 단일 자릿수 슬롯 — 위/아래 슬라이드 애니메이션
 * Single digit slot — slides up/down on change */
function Digit({ char, direction }: { char: string; direction: 'up' | 'down' | 'none' }) {
  const [current, setCurrent] = useState(char);
  const [previous, setPrevious] = useState(char);
  const [animating, setAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (char === current) return;
    setPrevious(current);
    setCurrent(char);
    setAnimating(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAnimating(false), 350);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [char, current]);

  // 숫자가 아닌 문자(콤마, 점, 통화기호 등)는 애니메이션 없이 렌더
  // Non-digit chars (comma, dot, currency symbols) render without animation
  const isDigit = /\d/.test(char);

  if (!isDigit) {
    return <span className="inline-block">{char}</span>;
  }

  return (
    <span
      className="inline-block relative overflow-hidden"
      style={{ width: '0.6em', height: '1.15em', verticalAlign: 'bottom' }}
    >
      {/* 현재 값 / Current value */}
      <span
        className="absolute inset-x-0 text-center"
        style={{
          transition: animating ? 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease' : 'none',
          transform: animating ? 'translateY(0)' : 'translateY(0)',
          opacity: 1,
          ...(animating
            ? {}
            : {}),
        }}
      >
        {current}
      </span>

      {/* 이전 값 (슬라이드 아웃) / Previous value (slides out) */}
      {animating && (
        <span
          className="absolute inset-x-0 text-center"
          style={{
            animation: `digit-slide-${direction === 'down' ? 'down' : 'up'}-out 350ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
          }}
        >
          {previous}
        </span>
      )}

      {/* 새 값 (슬라이드 인) / New value (slides in) */}
      {animating && (
        <span
          className="absolute inset-x-0 text-center"
          style={{
            animation: `digit-slide-${direction === 'down' ? 'down' : 'up'}-in 350ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
          }}
        >
          {current}
        </span>
      )}

      {/* 비-애니메이션 상태에서 표시 / Shown when not animating */}
      {!animating && (
        <span className="absolute inset-x-0 text-center">
          {current}
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

  // 길이가 다를 경우 우측 정렬(끝자리 기준) 매칭 / Right-align matching for different lengths
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
