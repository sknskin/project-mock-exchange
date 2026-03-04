/**
 * @file 툴팁 컴포넌트
 * @description 지연 호버 기반 툴팁 — 지정 시간(기본 1초) 후 자식 요소 아래에 표시
 *
 * @file Tooltip Component
 * @description Delayed hover tooltip — displays below child element after specified delay (default 1s)
 */
'use client';

import { useState, useRef, useCallback, type ReactNode } from 'react';

// 툴팁 Props / Tooltip Props
interface TooltipProps {
  /** 툴팁에 표시할 텍스트 / Text displayed in tooltip */
  label: string;
  /** 표시 지연 시간(ms), 기본 1000ms / Display delay in ms, default 1000ms */
  delay?: number;
  /** 툴팁을 감쌀 자식 요소 / Child element to wrap with tooltip */
  children: ReactNode;
}

/**
 * 1초 이상 호버 시 툴팁 표시 (Shows tooltip after hovering for 1+ second)
 */
export default function Tooltip({ label, delay = 1000, children }: TooltipProps) {
  // 툴팁 가시 상태 / Tooltip visibility state
  const [visible, setVisible] = useState(false);
  // 지연 타이머 참조 / Delay timer reference
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 마우스 진입 시 지연 후 표시 / Show after delay on mouse enter
  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  // 마우스 이탈 시 즉시 숨김 + 타이머 해제 / Hide immediately on mouse leave + clear timer
  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setVisible(false);
  }, []);

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {/* 조건부 렌더링: 가시 상태일 때만 절대 위치 툴팁 표시 / Conditional render: absolute-positioned tooltip only when visible */}
      {visible && (
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 rounded-md bg-bg-elevated border border-border text-[11px] font-medium text-text-secondary whitespace-nowrap shadow-lg z-50 pointer-events-none">
          {label}
        </span>
      )}
    </span>
  );
}
