'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/format';
import { Home, Briefcase, Star, Menu } from 'lucide-react';

const tabs = [
  { href: '/', label: '홈', icon: Home },
  { href: '/portfolio', label: '내 투자', icon: Briefcase },
  { href: '/leaderboard', label: '리더보드', icon: Star },
  { href: '/orders', label: '더보기', icon: Menu },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-primary/95 backdrop-blur-md border-t border-border md:hidden safe-bottom">
      <div className="flex items-center justify-around h-[52px]">
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
                'flex flex-col items-center gap-0.5 py-1 px-4',
                'transition-colors active:scale-95',
                isActive ? 'text-text-primary' : 'text-text-quaternary',
              )}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.2 : 1.6} />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
