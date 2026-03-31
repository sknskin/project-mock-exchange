/**
 * @file 주문 필터 컴포넌트
 * @description 검색, 상태 필터, 날짜 범위 필터를 포함한 주문 필터 바
 *
 * @file Order Filters Component
 * @description Order filter bar with search, status filter, and date range filter
 */
'use client';

import { Search, X } from 'lucide-react';
import StatusDropdown, { STATUS_OPTIONS } from './StatusDropdown';
import type { TranslationKey } from '@/lib/i18n';

interface OrderFiltersProps {
  searchInput: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  t: (key: TranslationKey) => string;
}

/**
 * 주문 필터 바 — 심볼 검색 + 상태 드롭다운 + 날짜 범위
 * Order filter bar — symbol search + status dropdown + date range
 */
export default function OrderFilters({
  searchInput,
  onSearchChange,
  statusFilter,
  onStatusChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  t,
}: OrderFiltersProps) {
  return (
    <>
      {/* 검색 + 상태 필터 바 / Search + Status filter bar */}
      <div className="flex gap-2 sm:gap-3 mb-5">
        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('orders.searchSymbol')}
            className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-9 py-2.5 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
          />
          {searchInput && (
            <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-text-quaternary hover:text-text-primary transition-colors" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Status filter – custom dropdown */}
        <StatusDropdown
          value={statusFilter}
          onChange={onStatusChange}
          options={STATUS_OPTIONS}
          t={t}
        />
      </div>

      {/* ORD-M-01: 커스텀 날짜 범위 필터 / Custom date range filter */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5">
        <label className="text-[12px] font-medium text-text-tertiary shrink-0">{t('orders.customRange')}</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          max={dateTo || undefined}
          className="bg-bg-secondary border border-border rounded-xl px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-accent/60 transition-colors"
          aria-label={t('orders.dateFrom')}
        />
        <span className="text-[12px] text-text-quaternary">~</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          min={dateFrom || undefined}
          className="bg-bg-secondary border border-border rounded-xl px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-accent/60 transition-colors"
          aria-label={t('orders.dateTo')}
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { onDateFromChange(''); onDateToChange(''); }}
            className="p-1.5 text-text-quaternary hover:text-text-primary transition-colors"
            aria-label="Clear date filter"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </>
  );
}
