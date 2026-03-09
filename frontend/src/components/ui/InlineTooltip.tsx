/**
 * @file 인라인 툴팁 컴포넌트
 * @description 금융 용어 옆에 (?) 아이콘을 표시하고, 호버/클릭 시 설명을 보여주는 재사용 가능 컴포넌트
 *
 * @file Inline Tooltip Component
 * @description Reusable component that shows a (?) icon next to financial terms with explanation on hover/click
 */
'use client';

import { useState, useRef, useCallback, useEffect, useId } from 'react';

// 인라인 툴팁 Props / Inline Tooltip Props
interface InlineTooltipProps {
  /** 툴팁에 표시할 설명 텍스트
   * Explanation text displayed in tooltip */
  text: string;
  /** 접근성 라벨 (선택)
   * Accessibility label (optional) */
  ariaLabel?: string;
}

/**
 * 금융 용어 옆에 (?) 아이콘을 표시하는 인라인 툴팁
 * - 호버 시 툴팁 표시 (데스크톱)
 * - 클릭/탭 시 토글 (모바일)
 * - 키보드 접근성 지원 (Enter/Space로 토글, Escape로 닫기)
 *
 * Inline tooltip with (?) icon next to financial terms
 * - Shows on hover (desktop)
 * - Toggles on click/tap (mobile)
 * - Keyboard accessible (Enter/Space to toggle, Escape to close)
 */
export default function InlineTooltip({ text, ariaLabel }: InlineTooltipProps) {
  const tooltipId = useId();
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  // 외부 클릭 시 닫기 / Close on outside click
  useEffect(() => {
    if (!visible) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [visible]);

  // 키보드 핸들러: Enter/Space로 토글, Escape로 닫기 / Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setVisible((v) => !v);
      } else if (e.key === 'Escape') {
        setVisible(false);
      }
    },
    [],
  );

  return (
    <span ref={containerRef} className="relative inline-flex items-center ml-1">
      {/* (?) 아이콘 버튼 / (?) icon button */}
      <button
        type="button"
        aria-label={ariaLabel || 'Info'}
        aria-describedby={visible ? tooltipId : undefined}
        aria-expanded={visible}
        onClick={() => setVisible((v) => !v)}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onKeyDown={handleKeyDown}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-border text-[10px] font-bold leading-none text-text-quaternary hover:text-text-secondary hover:border-text-tertiary focus:outline-none focus-visible:ring-1 focus-visible:ring-accent transition-colors cursor-help"
      >
        ?
      </button>

      {/* 툴팁 본문 / Tooltip body */}
      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-3 py-2 rounded-lg bg-bg-elevated border border-border text-[11px] leading-relaxed font-medium text-text-secondary whitespace-normal w-52 shadow-lg z-50"
        >
          {text}
        </span>
      )}
    </span>
  );
}
