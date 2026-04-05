/**
 * @file 페이지네이션 컴포넌트
 * @description 총 건수(좌), 페이지 번호(중앙), 건씩 보기(우)
 *
 * @file Pagination Component
 * @description Total count(left), page numbers(center), per-page selector(right)
 */
'use client';

import { memo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

// 페이지네이션 Props / Pagination Props
interface PaginationProps {
  /** 현재 페이지 번호
   * Current page number */
  page: number;
  /** 전체 페이지 수
   * Total number of pages */
  totalPages: number;
  /** 전체 항목 수
   * Total item count */
  total: number;
  /** 페이지당 항목 수
   * Items per page */
  limit: number;
  /** 페이지 변경 콜백
   * Page change callback */
  onPageChange: (page: number) => void;
  /** 페이지당 항목 수 변경 콜백 (선택)
   * Per-page change callback (optional) */
  onLimitChange?: (limit: number) => void;
  /** 건씩 보기 옵션 (기본: [10, 20, 50])
   * Per-page options (default: [10, 20, 50]) */
  limitOptions?: number[];
}

function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50],
}: PaginationProps) {
  const { t } = useTranslation();

  /** 페이지 변경 후 상단 스크롤
   * Change page and scroll to top */
  const handlePageChange = (p: number) => {
    onPageChange(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 표시할 페이지 번호 배열 생성 (현재 페이지 +-2 범위 + 말줄임) / Generate page number array (current +-2 range + ellipsis)
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
    <div className="flex items-center gap-1 bg-bg-secondary border border-border rounded-lg p-0.5">
      {limitOptions.map((n) => (
        <button
          key={n}
          onClick={() => onLimitChange(n)}
          className={cn(
            'px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap',
            limit === n
              ? 'bg-accent text-white'
              : 'text-text-quaternary hover:text-text-secondary',
          )}
        >
          {n}{t('pagination.perPage')}
        </button>
      ))}
    </div>
  ) : (
    <span className="text-[12px] text-text-quaternary whitespace-nowrap">
      {limit}{t('pagination.perPage')}
    </span>
  );

  // 레이아웃: absolute로 좌/우에 총건수·건씩보기 배치, 페이지 번호는 justify-center로 가운데 고정
  // Layout: absolute positions for total/per-page on left/right, page numbers centered via justify-center
  return (
    <div className="relative flex items-center justify-center py-3">
      {/* 총 건수 — 좌측 고정 (모바일에서 숨김) / Total count — fixed left (hidden on mobile) */}
      <div className="absolute left-0 hidden sm:block">{totalLabel}</div>
      {/* 페이지 번호 — 가운데 정렬 (-ml-8로 시각적 중심 미세 조정) / Page numbers — centered (-ml-8 for visual center fine-tuning) */}
      <div className="flex items-center gap-0.5 -ml-8">
        <button
          onClick={() => handlePageChange(1)}
          disabled={page === 1}
          className="hidden sm:block p-2.5 rounded text-text-quaternary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          className="p-2.5 rounded text-text-quaternary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1 text-text-quaternary text-[12px]">...</span>
          ) : (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
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
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2.5 rounded text-text-quaternary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={page >= totalPages}
          className="hidden sm:block p-2.5 rounded text-text-quaternary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* 건씩 보기 — 우측 고정 (모바일에서 숨김) / Per-page selector — fixed right (hidden on mobile) */}
      <div className="absolute right-0 hidden sm:block">{perPageEl}</div>
    </div>
  );
}

export default memo(Pagination);
