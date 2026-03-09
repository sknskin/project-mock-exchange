/**
 * @file 상태 드롭다운 컴포넌트
 * @description 색상 점(dot)과 라벨로 상태를 선택할 수 있는 커스텀 드롭다운
 *
 * @file Status Dropdown Component
 * @description Custom dropdown for selecting status with colored dot and label
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/format';

interface StatusOption {
  value: string;
  label: string;
  color: string;
}

interface StatusDropdownProps {
  value: string;
  options: StatusOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** 상태 선택 드롭다운
 * Status selection dropdown */
export default function StatusDropdown({ value, options, onChange, disabled }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg border border-border transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {current && <span className={`w-1.5 h-1.5 rounded-full ${current.color}`} />}
        <span className="text-text-secondary">{current?.label ?? value}</span>
        <ChevronDown className="w-3 h-3 text-text-quaternary" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 right-0 bg-bg-elevated border border-border rounded-lg shadow-lg py-1 min-w-[120px] animate-dropdown-in">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-bg-secondary transition-colors',
                opt.value === value && 'bg-bg-secondary font-semibold',
              )}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${opt.color}`} />
              <span className="text-text-primary">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
