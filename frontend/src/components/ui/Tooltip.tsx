'use client';

import { useState, useRef, useCallback, type ReactNode } from 'react';

interface TooltipProps {
  label: string;
  delay?: number;
  children: ReactNode;
}

/**
 * 1초 이상 호버 시 툴팁 표시 (Shows tooltip after hovering for 1+ second)
 */
export default function Tooltip({ label, delay = 1000, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setVisible(false);
  }, []);

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 rounded-md bg-bg-elevated border border-border text-[11px] font-medium text-text-secondary whitespace-nowrap shadow-lg z-50 pointer-events-none">
          {label}
        </span>
      )}
    </span>
  );
}
