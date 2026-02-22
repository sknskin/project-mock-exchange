/**
 * @file 하단 네비게이션
 * @description 모바일 화면에서 보여지는 하단 탭 네비게이션
 *
 * @file Bottom Navigation
 * @description Bottom tab navigation visible on mobile screens
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import { LayoutDashboard, Briefcase, Star, Newspaper, LogIn, Menu } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  const tabs = isAuthenticated
    ? [
        { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { href: '/portfolio', label: t('nav.portfolio'), icon: Briefcase },
        { href: '/leaderboard', label: t('nav.leaderboard'), icon: Star },
        { href: '/orders', label: t('nav.more'), icon: Menu },
      ]
    : [
        { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { href: '/news', label: t('nav.news'), icon: Newspaper },
        { href: '/login', label: t('nav.login'), icon: LogIn },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-primary/95 backdrop-blur-md border-t border-border lg:hidden safe-bottom">
      <div className="flex items-center justify-around h-[52px]">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
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
