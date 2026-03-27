/**
 * @file 하단 네비게이션
 * @description 모바일 화면에서 보여지는 하단 탭 네비게이션
 *              SSR hydration 깜빡임 방지: 모든 탭을 항상 렌더하고 CSS로 가시성 제어
 *
 * @file Bottom Navigation
 * @description Bottom tab navigation visible on mobile screens
 *              Prevents SSR hydration flicker: renders all tabs, CSS controls visibility
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import { LayoutDashboard, Briefcase, Star, Newspaper, LogIn, ClipboardList, Users } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-primary/95 backdrop-blur-md border-t border-border lg:hidden safe-bottom landscape-hide-sm" role="navigation" aria-label="Bottom navigation">
      <div className="flex items-center justify-around h-[56px] md:h-[60px]">
        {/* 항상 표시 / Always visible */}
        <Link
          href="/dashboard"
          aria-label={t('nav.dashboard')}
          aria-current={pathname.startsWith('/dashboard') ? 'page' : undefined}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 min-h-[44px] min-w-[44px] transition-all duration-100 active:scale-95',
            pathname.startsWith('/dashboard') ? 'text-text-primary' : 'text-text-quaternary',
          )}
        >
          <LayoutDashboard className="w-[22px] h-[22px]" strokeWidth={pathname.startsWith('/dashboard') ? 2.2 : 1.6} />
          <span className="text-[12px] font-semibold">{t('nav.dashboard')}</span>
        </Link>

        {/* 인증 시 표시 / Auth-only tabs */}
        <div className="contents auth-show">
          <Link
            href="/portfolio"
            aria-label={t('nav.portfolio')}
            aria-current={pathname.startsWith('/portfolio') ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 min-h-[44px] min-w-[44px] transition-all duration-100 active:scale-95',
              pathname.startsWith('/portfolio') ? 'text-text-primary' : 'text-text-quaternary',
            )}
          >
            <Briefcase className="w-[22px] h-[22px]" strokeWidth={pathname.startsWith('/portfolio') ? 2.2 : 1.6} />
            <span className="text-[12px] font-semibold">{t('nav.portfolio')}</span>
          </Link>
          <Link
            href="/orders"
            aria-label={t('nav.orders')}
            aria-current={pathname.startsWith('/orders') ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 min-h-[44px] min-w-[44px] transition-all duration-100 active:scale-95',
              pathname.startsWith('/orders') ? 'text-text-primary' : 'text-text-quaternary',
            )}
          >
            <ClipboardList className="w-[22px] h-[22px]" strokeWidth={pathname.startsWith('/orders') ? 2.2 : 1.6} />
            <span className="text-[12px] font-semibold">{t('nav.orders')}</span>
          </Link>
          <Link
            href="/leaderboard"
            aria-label={t('nav.leaderboard')}
            aria-current={pathname.startsWith('/leaderboard') ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 min-h-[44px] min-w-[44px] transition-all duration-100 active:scale-95',
              pathname.startsWith('/leaderboard') ? 'text-text-primary' : 'text-text-quaternary',
            )}
          >
            <Star className="w-[22px] h-[22px]" strokeWidth={pathname.startsWith('/leaderboard') ? 2.2 : 1.6} />
            <span className="text-[12px] font-semibold">{t('nav.leaderboard')}</span>
          </Link>
        </div>

        {/* 비인증 시 표시 / Non-auth tabs */}
        <div className="contents auth-hide">
          <Link
            href="/news"
            aria-label={t('nav.news')}
            aria-current={pathname.startsWith('/news') ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 min-h-[44px] min-w-[44px] transition-all duration-100 active:scale-95',
              pathname.startsWith('/news') ? 'text-text-primary' : 'text-text-quaternary',
            )}
          >
            <Newspaper className="w-[22px] h-[22px]" strokeWidth={pathname.startsWith('/news') ? 2.2 : 1.6} />
            <span className="text-[12px] font-semibold">{t('nav.news')}</span>
          </Link>
          <Link
            href="/community"
            aria-label={t('nav.community')}
            aria-current={pathname.startsWith('/community') ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 min-h-[44px] min-w-[44px] transition-all duration-100 active:scale-95',
              pathname.startsWith('/community') ? 'text-text-primary' : 'text-text-quaternary',
            )}
          >
            <Users className="w-[22px] h-[22px]" strokeWidth={pathname.startsWith('/community') ? 2.2 : 1.6} />
            <span className="text-[12px] font-semibold">{t('nav.community')}</span>
          </Link>
          <Link
            href="/login"
            aria-label={t('nav.login')}
            aria-current={pathname.startsWith('/login') ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 min-h-[44px] min-w-[44px] transition-all duration-100 active:scale-95',
              pathname.startsWith('/login') ? 'text-text-primary' : 'text-text-quaternary',
            )}
          >
            <LogIn className="w-[22px] h-[22px]" strokeWidth={pathname.startsWith('/login') ? 2.2 : 1.6} />
            <span className="text-[12px] font-semibold">{t('nav.login')}</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
