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
      <div className="flex bg-bg-secondary rounded-xl p-1 gap-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex-1 h-9 px-3 text-[13px] font-bold rounded-lg transition-all duration-200',
              activeTab === tab.key
                ? 'bg-bg-tertiary text-text-primary shadow-sm'
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
    <div className="flex bg-bg-secondary/40 border-y border-border/50">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex-1 h-11 text-[14px] font-bold transition-all duration-200 relative',
            activeTab === tab.key
              ? 'text-text-primary'
              : 'text-text-quaternary hover:text-text-tertiary',
          )}
        >
          {tab.label}
          {activeTab === tab.key && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] h-[2.5px] bg-text-primary rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
