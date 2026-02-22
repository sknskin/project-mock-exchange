/**
 * @file 페이지네이션 컴포넌트
 * @description 총 건수(좌), 페이지 번호(중앙), 건씩 보기(우)
 *
 * @file Pagination Component
 * @description Total count(left), page numbers(center), per-page selector(right)
 */
'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const { t } = useTranslation();

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    const range = 2;
    const start = Math.max(1, page - range);
    const end = Math.min(totalPages, page + range);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const totalLabel = (
    <span className="text-[12px] text-text-quaternary whitespace-nowrap">
      {t('pagination.total')} {total}{t('pagination.count')}
    </span>
  );

  const perPageEl = onLimitChange ? (
    <select
      value={limit}
      onChange={(e) => onLimitChange(Number(e.target.value))}
      className="bg-bg-secondary border border-border rounded px-1.5 py-0.5 text-[12px] text-text-secondary whitespace-nowrap"
    >
      {[10, 20, 50, 100].map((n) => (
        <option key={n} value={n}>{n}{t('pagination.perPage')}</option>
      ))}
    </select>
  ) : (
    <span className="text-[12px] text-text-quaternary whitespace-nowrap">
      {limit}{t('pagination.perPage')}
    </span>
  );

  return (
    <div className="flex flex-col items-center gap-2 py-3 sm:flex-row sm:justify-between">
      {/* Mobile: total + per-page row */}
      <div className="flex items-center justify-between w-full sm:hidden">
        {totalLabel}
        {perPageEl}
      </div>

      {/* Total count — desktop only (left) */}
      <div className="hidden sm:block">{totalLabel}</div>

      {/* Page numbers — center */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="hidden sm:block p-2 rounded text-text-quaternary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-2 rounded text-text-quaternary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1 text-text-quaternary text-[12px]">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'min-w-[32px] h-8 px-1.5 rounded text-[13px] font-medium transition-colors',
                p === page
                  ? 'bg-accent text-white'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary',
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded text-text-quaternary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="hidden sm:block p-2 rounded text-text-quaternary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Per-page — desktop only (right) */}
      <div className="hidden sm:block">{perPageEl}</div>
    </div>
  );
}
