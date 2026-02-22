/**
 * @file 헤더 컴포넌트
 * @description 로고, 네비게이션, 로그인/로그아웃, 모바일 메뉴, 알림, 관리자 메뉴
 *
 * @file Header Component
 * @description Header with logo, navigation, auth, mobile menu, notifications, admin menus
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import { LogOut, Search, Menu, X, Megaphone, Newspaper, Users, BarChart3 } from 'lucide-react';
import VirtuExLogo from '@/components/ui/VirtuExLogo';
import NotificationBell from '@/components/layout/NotificationBell';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const isAdmin = user?.role === 'SYSTEM' || user?.role === 'ADMIN';

  const navItems = [
    { href: '/dashboard', label: t('nav.dashboard') },
    ...(isAuthenticated
      ? [
          { href: '/portfolio', label: t('nav.portfolio') },
          { href: '/orders', label: t('nav.orders') },
          { href: '/leaderboard', label: t('nav.leaderboard') },
        ]
      : []),
    { href: '/news', label: t('nav.news') },
    ...(isAuthenticated ? [{ href: '/announcements', label: t('nav.announcements') }] : []),
    ...(isAdmin
      ? [
          { href: '/admin/users', label: t('nav.userManagement') },
          { href: '/admin/stats', label: t('nav.statistics') },
        ]
      : []),
  ];

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-bg-primary/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[1080px] mx-auto px-5 sm:px-8 lg:px-10 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2">
              <VirtuExLogo size={24} />
              <span className="font-extrabold text-[20px] text-text-primary tracking-tight">
                VirtuEx
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-[14px] font-medium transition-colors py-1',
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'text-text-primary'
                      : 'text-text-tertiary hover:text-text-primary',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* 대시보드에서만 검색란 표시 / Show search only on dashboard */}
            {pathname === '/dashboard' && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-spotlight'))}
                className="hidden lg:flex items-center gap-2.5 text-text-quaternary hover:text-text-tertiary transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span className="text-[13px]">
                  <kbd className="px-1.5 py-0.5 text-[11px] border border-border rounded text-text-tertiary font-mono">/</kbd>
                  {t('nav.search')}
                </span>
              </button>
            )}

            {isAuthenticated ? (
              <>
                {/* 알림 벨 / Notification Bell */}
                <div className="relative hidden lg:block">
                  <NotificationBell />
                </div>

                {/* 사용자명 → 마이페이지 / Username → My Page */}
                <Link
                  href="/mypage"
                  className="text-[13px] text-text-secondary font-medium hidden lg:block hover:text-accent transition-colors"
                >
                  {user?.username}
                </Link>
                <button
                  onClick={() => setLogoutModalOpen(true)}
                  className="hidden lg:flex p-2.5 text-danger hover:text-danger/80 transition-colors rounded-lg hover:bg-bg-secondary translate-y-[1px]"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden lg:inline-flex h-10 px-6 items-center text-[14px] font-bold text-white bg-accent rounded-lg hover:bg-accent/85 transition-colors"
              >
                {t('nav.login')}
              </Link>
            )}

            {!isAuthenticated && (
              <Link
                href="/login"
                className="lg:hidden text-[13px] font-bold text-accent"
              >
                {t('nav.login')}
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 text-text-secondary hover:text-text-primary transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-0 right-0 w-[280px] h-full bg-bg-primary border-l border-border animate-slide-in-right">
            <div className="flex items-center justify-between px-6 h-[60px] border-b border-border">
              <span className="text-[16px] font-bold text-text-primary">{t('nav.menu')}</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-text-tertiary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="px-4 py-5 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium rounded-xl transition-colors',
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'text-text-primary bg-bg-secondary'
                      : 'text-text-tertiary hover:text-text-primary',
                  )}
                >
                  {item.href === '/news' && <Newspaper className="w-4 h-4" />}
                  {item.href === '/announcements' && <Megaphone className="w-4 h-4" />}
                  {item.href === '/admin/users' && <Users className="w-4 h-4" />}
                  {item.href === '/admin/stats' && <BarChart3 className="w-4 h-4" />}
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-6 pt-4 mt-2 border-t border-border">
              {isAuthenticated ? (
                <div className="space-y-4">
                  <Link href="/mypage" className="block text-[14px] text-text-secondary hover:text-accent transition-colors">
                    <span className="text-text-primary font-bold">{user?.username}</span>
                    <span className="ml-2 text-[12px] text-text-quaternary">{t('nav.mypage')}</span>
                  </Link>
                  <button
                    onClick={() => { setLogoutModalOpen(true); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-3.5 text-[14px] font-medium text-danger bg-bg-secondary rounded-xl"
                  >
                    <LogOut className="w-4 h-4" /> {t('nav.logout')}
                  </button>
                </div>
              ) : (
                <Link href="/login" className="flex items-center justify-center w-full h-12 text-[14px] font-bold text-white bg-accent rounded-xl">
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </div>
          <style jsx>{`
            @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
            .animate-slide-in-right { animation: slide-in-right 0.2s ease-out; }
          `}</style>
        </div>
      )}

      {/* 로그아웃 확인 모달 / Logout Confirmation Modal */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setLogoutModalOpen(false)} />
          <div className="relative bg-bg-primary border border-border rounded-2xl p-6 w-[320px] shadow-2xl">
            <h3 className="text-[16px] font-bold text-text-primary text-center">
              {t('modal.logoutTitle')}
            </h3>
            <p className="text-[14px] text-text-secondary text-center mt-3">
              {t('modal.logoutMessage')}
            </p>
            {/* 버튼: 확인(좌) + 취소(우) / Buttons: confirm(left) + cancel(right) */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { logout(); setLogoutModalOpen(false); router.push('/dashboard'); }}
                className="flex-1 h-11 rounded-xl bg-danger text-white text-[14px] font-semibold hover:bg-danger/85 transition-colors"
              >
                {t('modal.logoutConfirm')}
              </button>
              <button
                onClick={() => setLogoutModalOpen(false)}
                className="flex-1 h-11 rounded-xl border border-border text-[14px] font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
              >
                {t('modal.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
