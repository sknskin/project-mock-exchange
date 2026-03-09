/**
 * @file 종목 검색바
 * @description 키보드 단축키(/)를 지원하는 종목 검색 컴포넌트
 *
 * @file Search Bar
 * @description Asset search component with keyboard shortcut (/) support
 */
'use client';

import { Search } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

// 검색바 Props / Search Bar Props
interface SearchBarProps {
  /** 검색어
   * Search query */
  value: string;
  /** 검색어 변경 콜백
   * Search query change callback */
  onChange: (value: string) => void;
  /** 플레이스홀더 텍스트
   * Placeholder text */
  placeholder?: string;
}

/** 종목 검색 입력 바
 * Asset search input bar */
export default function SearchBar({
  value,
  onChange,
  placeholder,
}: SearchBarProps) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('search.asset');
  return (
    <div className="relative px-6 py-3">
      <Search className="absolute left-9 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary" />
      <input
        type="text"
        placeholder={resolvedPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-4 py-2.5 bg-bg-secondary border-none rounded-lg text-[14px] text-text-primary placeholder-text-quaternary focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all font-medium"
      />
    </div>
  );
}
