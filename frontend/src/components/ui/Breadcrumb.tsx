/**
 * @file 브레드크럼 네비게이션 컴포넌트
 * @description 현재 페이지의 계층 구조를 보여주는 경로 탐색 컴포넌트
 *
 * @file Breadcrumb Navigation Component
 * @description Path navigation component showing the current page hierarchy
 *
 * NAV-L-02: 주요 페이지에 브레드크럼 추가 — 사용자 위치 인식 개선
 * NAV-L-02: Add breadcrumbs to key pages — improve user location awareness
 */
'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

// 개별 크럼 타입 / Individual crumb type
interface BreadcrumbItem {
  /** 표시 라벨 / Display label */
  label: string;
  /** 링크 경로 (없으면 현재 페이지) / Link href (omit for current page) */
  href?: string;
}

interface BreadcrumbProps {
  /** 경로 목록 / Path items */
  items: BreadcrumbItem[];
}

/**
 * 브레드크럼 — 마지막 항목은 현재 페이지 (링크 아님)
 * Breadcrumb — last item is current page (no link)
 */
export default function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12px] text-text-quaternary mb-2 overflow-x-auto scrollbar-hide">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1 shrink-0">
            {i > 0 && <ChevronRight className="w-3 h-3 text-text-quaternary/50" aria-hidden="true" />}
            {isLast || !item.href ? (
              <span className="text-text-secondary font-medium truncate max-w-[160px]" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-text-secondary transition-colors truncate max-w-[120px]"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
