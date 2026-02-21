/**
 * @file 페이지네이션 컴포넌트
 * @description 현재 페이지 ± 5, 처음/끝 페이지 표시, 페이지 사이즈 변경
 *
 * @file Pagination Component
 * @description Current page ± 5, first/last page, page size selector
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
    const range = 5;
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

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-2 text-[12px] text-text-quaternary">
        <span>{total}{t('pagination.showing')}</span>
        {onLimitChange && (
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="bg-bg-secondary border border-border rounded px-1.5 py-0.5 text-[12px] text-text-secondary"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n}{t('pagination.perPage')}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="p-1.5 rounded text-text-quaternary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded text-text-quaternary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
          className="p-1.5 rounded text-text-quaternary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="p-1.5 rounded text-text-quaternary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
