/**
 * @file 주문 상태 드롭다운 컴포넌트
 * @description 네이티브 select 대신 디자인 일관성을 위한 커스텀 드롭다운
 *
 * @file Order Status Dropdown Component
 * @description Custom dropdown replacing native select for design consistency
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/format';
import type { TranslationKey } from '@/lib/i18n';

// 주문 상태 필터 옵션 — 서버 API의 status 파라미터 값과 일치
// Order status filter options — match server API status param values
export const STATUS_OPTIONS: { key: string; labelKey: TranslationKey }[] = [
  { key: 'all', labelKey: 'orders.all' },
  { key: 'PENDING', labelKey: 'orders.pending' },
  { key: 'FILLED', labelKey: 'orders.filled' },
  { key: 'CANCELLED', labelKey: 'orders.cancelled' },
];

interface StatusDropdownProps {
  value: string;
  onChange: (v: string) => void;
  options: typeof STATUS_OPTIONS;
  t: (key: TranslationKey) => string;
}

/**
 * 커스텀 드롭다운 — 네이티브 select 대신 디자인 일관성을 위해 사용
 * Custom dropdown — replaces native select for design consistency
 */
export default function StatusDropdown({
  value,
  onChange,
  options,
  t,
}: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기 / Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedLabel = options.find((o) => o.key === value);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 bg-bg-secondary border border-border rounded-xl pl-3 pr-2 sm:pl-4 sm:pr-3 py-2.5',
          'text-[13px] sm:text-[14px] font-medium transition-colors',
          open && 'border-accent/60',
          value !== 'all' ? 'text-text-primary' : 'text-text-tertiary',
        )}
      >
        <span className="whitespace-nowrap">{selectedLabel ? t(selectedLabel.labelKey) : ''}</span>
        <ChevronDown className={cn('w-4 h-4 text-text-quaternary transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[140px] bg-bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden animate-dropdown-in">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={cn(
                'flex items-center justify-between w-full px-3.5 py-2.5 text-left text-[13px] sm:text-[14px] font-medium transition-colors',
                opt.key === value
                  ? 'text-accent bg-accent/10'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
              )}
            >
              {t(opt.labelKey)}
              {opt.key === value && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
