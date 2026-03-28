/**
 * @file 탭 컴포넌트
 * @description 가로 스크롤 가능한 탭 네비게이션 컴포넌트
 *
 * @file Tabs Component
 * @description Horizontally scrollable tab navigation component
 */
'use client';

import { memo } from 'react';
import { cn } from '@/lib/format';

// 개별 탭 항목 타입 / Individual tab item type
interface Tab {
  /** 탭 식별 키
   * Tab identifier key */
  key: string;
  /** 표시 라벨
   * Display label */
  label: string;
}

// 탭 컴포넌트 Props / Tabs component Props
interface TabsProps {
  /** 탭 목록
   * List of tabs */
  tabs: Tab[];
  /** 현재 선택된 탭 키
   * Currently selected tab key */
  activeTab: string;
  /** 탭 변경 콜백
   * Tab change callback */
  onChange: (key: string) => void;
  /** 스타일 변형: default(밑줄) 또는 pill(둥근 버튼)
   * Style variant: default(underline) or pill(rounded button) */
  variant?: 'default' | 'pill';
  /** A11Y-M-01: 탭 그룹 ID — aria-controls/id 링크에 사용
   * A11Y-M-01: Tab group ID — used for aria-controls/id linking */
  id?: string;
}

function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  id,
}: TabsProps) {
  // A11Y-M-01: 탭 패널 ID 생성 — aria-controls와 id 링크에 사용
  // A11Y-M-01: Generate tab panel ID — used for aria-controls and id linking
  const panelId = id ? `${id}-tabpanel` : undefined;

  // pill 변형: 둥근 테두리 버튼 스타일 / Pill variant: rounded border button style
  if (variant === 'pill') {
    return (
      <div className="flex gap-2.5" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            id={id ? `${id}-tab-${tab.key}` : undefined}
            aria-selected={activeTab === tab.key}
            aria-controls={activeTab === tab.key ? panelId : undefined}
            onClick={() => onChange(tab.key)}
            className={cn(
              // MOB-M-02: 최소 터치 타겟 44px 보장 (WCAG) / Ensure 44px min touch target (WCAG)
              'h-9 min-h-[44px] px-4 text-[13px] font-semibold rounded-full border transition-colors',
              activeTab === tab.key
                ? 'border-accent text-accent bg-accent/[0.08]'
                : 'border-border text-text-quaternary hover:text-text-tertiary hover:border-text-quaternary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  // default 변형: 밑줄 인디케이터 스타일 / Default variant: underline indicator style
  return (
    <div className="flex border-b border-border" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          id={id ? `${id}-tab-${tab.key}` : undefined}
          aria-selected={activeTab === tab.key}
          aria-controls={activeTab === tab.key ? panelId : undefined}
          onClick={() => onChange(tab.key)}
          className={cn(
            // MOB-M-02: 최소 터치 타겟 44px 보장 (WCAG) / Ensure 44px min touch target (WCAG)
            'flex-1 py-3.5 min-h-[44px] text-[14px] font-bold transition-colors relative',
            activeTab === tab.key
              ? 'text-text-primary'
              : 'text-text-quaternary hover:text-text-tertiary',
          )}
        >
          {tab.label}
          {/* ANI-M-01: 밑줄 인디케이터에 CSS 트랜지션 추가 — 탭 전환 시 부드러운 애니메이션
              ANI-M-01: Add CSS transition to underline indicator — smooth animation on tab switch */}
          <span
            className={cn(
              'absolute bottom-0 left-1/2 h-[2px] bg-accent rounded-full transition-all duration-300 ease-out',
              activeTab === tab.key
                ? '-translate-x-1/2 w-[calc(100%-24px)] opacity-100'
                : '-translate-x-1/2 w-0 opacity-0',
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default memo(Tabs);

/** A11Y-M-01: 탭 패널 래퍼 — role="tabpanel"과 id/aria-labelledby 자동 연결
 * A11Y-M-01: Tab panel wrapper — auto-links role="tabpanel" with id/aria-labelledby */
export function TabPanel({
  id,
  activeTab,
  children,
}: {
  id: string;
  activeTab: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`${id}-tabpanel`}
      aria-labelledby={`${id}-tab-${activeTab}`}
    >
      {children}
    </div>
  );
}
