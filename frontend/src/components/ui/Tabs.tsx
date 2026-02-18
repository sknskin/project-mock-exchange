/**
 * @file 탭 컴포넌트
 * @description 가로 스크롤 가능한 탭 네비게이션 컴포넌트
 *
 * @file Tabs Component
 * @description Horizontally scrollable tab navigation component
 */
'use client';

import { cn } from '@/lib/format';

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  variant?: 'default' | 'pill';
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
}: TabsProps) {
  if (variant === 'pill') {
    return (
      <div className="flex gap-2.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'h-9 px-4 text-[13px] font-semibold rounded-full border transition-colors',
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

  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex-1 py-3.5 text-[14px] font-bold transition-colors relative',
            activeTab === tab.key
              ? 'text-text-primary'
              : 'text-text-quaternary hover:text-text-tertiary',
          )}
        >
          {tab.label}
          {activeTab === tab.key && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] h-[2px] bg-accent rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
