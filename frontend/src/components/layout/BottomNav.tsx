'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/format';
import { Home, Star, Briefcase, Menu } from 'lucide-react';

const tabs = [
  { href: '/', label: '홈', icon: Home },
  { href: '/portfolio', label: '내 투자', icon: Briefcase },
  { href: '/leaderboard', label: '리더보드', icon: Star },
  { href: '/orders', label: '더보기', icon: Menu },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-primary/95 backdrop-blur-xl border-t border-border md:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1 px-3 min-w-[64px]',
                'transition-colors',
                isActive ? 'text-accent' : 'text-text-tertiary',
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
