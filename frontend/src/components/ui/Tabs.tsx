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
      <div className="flex gap-1.5 p-1 bg-bg-secondary rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex-1 py-2 px-3 text-[13px] font-bold rounded-md transition-all duration-150',
              activeTab === tab.key
                ? 'bg-bg-tertiary text-text-primary'
                : 'text-text-quaternary hover:text-text-tertiary',
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
            'flex-1 py-3 text-[14px] font-bold transition-all duration-150 relative',
            activeTab === tab.key
              ? 'text-text-primary'
              : 'text-text-quaternary hover:text-text-tertiary',
          )}
        >
          {tab.label}
          {activeTab === tab.key && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] h-[2px] bg-text-primary rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
