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
      <div className="flex gap-2 p-1 bg-bg-secondary rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-200',
              activeTab === tab.key
                ? 'bg-bg-tertiary text-text-primary'
                : 'text-text-secondary hover:text-text-primary',
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
            'flex-1 py-3 text-sm font-medium transition-all duration-200 relative',
            activeTab === tab.key
              ? 'text-text-primary'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {tab.label}
          {activeTab === tab.key && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
      ))}
    </div>
  );
}
