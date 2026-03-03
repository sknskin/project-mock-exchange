/**
 * @file 헤더 컴포넌트
 * @description 로고, 네비게이션, 로그인/로그아웃, 모바일 메뉴, 알림, 관리자 메뉴
 *              SSR hydration 깜빡임 방지: 모든 메뉴를 항상 렌더하고 CSS로 가시성 제어
 *
 * @file Header Component
 * @description Header with logo, navigation, auth, mobile menu, notifications, admin menus
 *              Prevents SSR hydration flicker: renders all items, CSS controls visibility
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import { LogOut, Search, Menu, X, Megaphone, Newspaper, Users, BarChart3, LayoutDashboard, Briefcase, ClipboardList, Trophy, ChevronDown, User, Sun, Moon, Globe, HelpCircle, Settings, Activity, FileText } from 'lucide-react';
import dynamic from 'next/dynamic';
import VirtuExLogo from '@/components/ui/VirtuExLogo';
const NotificationBell = dynamic(() => import('@/components/layout/NotificationBell'), { ssr: false });
import ChatButton from '@/components/chat/ChatButton';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme, locale, toggleLocale } = useSettingsStore();

  // Zustand 상태 변경 시 html data 속성 동기화 (로그인/로그아웃 시 CSS 즉시 반영)
  // Sync html data attributes with Zustand state for CSS-based visibility
  useEffect(() => {
    const html = document.documentElement;
    if (isAuthenticated) {
      html.dataset.authed = '1';
      if (user?.role) html.dataset.role = user.role;
    } else {
      delete html.dataset.authed;
      delete html.dataset.role;
    }
  }, [isAuthenticated, user?.role]);

  // 모바일 메뉴용 navItems (메뉴 열릴 때만 사용, hydration 이후이므로 조건부 OK)
  // Mobile menu navItems (only used when menu is open, after hydration, so conditional OK)
  const isAdmin = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
  const mobileNavItems = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/news', label: t('nav.news'), icon: Newspaper },
    ...(isAuthenticated
      ? [
          { href: '/portfolio', label: t('nav.portfolio'), icon: Briefcase },
          { href: '/orders', label: t('nav.orders'), icon: ClipboardList },
          { href: '/leaderboard', label: t('nav.leaderboard'), icon: Trophy },
          { href: '/announcements', label: t('nav.announcements'), icon: Megaphone },
          { href: '/community', label: t('nav.community'), icon: Users },
        ]
      : []),
  ];

  const mobileAdminItems = isAdmin
    ? [
        { href: '/admin/users', label: t('nav.userManagement'), icon: Users },
        { href: '/admin/stats', label: t('nav.statistics'), icon: BarChart3 },
        { href: '/admin/audit', label: t('nav.audit'), icon: FileText },
        { href: '/admin/health', label: t('nav.health'), icon: Activity },
        { href: '/admin/settings', label: t('nav.settings'), icon: Settings },
      ]
    : [];

  useEffect(() => { setMobileMenuOpen(false); setUserMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // 각 페이지에서 커스텀 이벤트로 모바일 메뉴를 열 수 있도록 리스너 등록
  // Allow pages to open mobile menu via custom event
  useEffect(() => {
    const handler = () => setMobileMenuOpen(true);
    window.addEventListener('open-mobile-menu', handler);
    return () => window.removeEventListener('open-mobile-menu', handler);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-bg-primary/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-6 lg:gap-10">
            <Link href="/" className="flex items-center gap-2">
              <VirtuExLogo size={24} />
              <span className="font-extrabold text-[17px] sm:text-[20px] text-text-primary tracking-tight">
                VirtuEx
              </span>
            </Link>

            {/* 데스크톱 네비게이션: 모든 항목 렌더, CSS 클래스로 가시성 제어 */}
            {/* Desktop nav: all items rendered, CSS classes control visibility */}
            <nav className="hidden lg:flex items-center gap-4 xl:gap-6" role="navigation" aria-label="Main navigation">
              <Link
                href="/dashboard"
                className={cn(
                  'text-[13px] xl:text-[14px] font-medium transition-colors py-1 whitespace-nowrap',
                  pathname === '/dashboard' || pathname.startsWith('/dashboard/')
                    ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary',
                )}
              >
                {t('nav.dashboard')}
              </Link>

              <Link
                href="/news"
                className={cn(
                  'text-[13px] xl:text-[14px] font-medium transition-colors py-1 whitespace-nowrap',
                  pathname === '/news' || pathname.startsWith('/news/')
                    ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary',
                )}
              >
                {t('nav.news')}
              </Link>

              {/* 비인증 시 도움말 표시 / Help link visible pre-login */}
              <div className="contents auth-hide">
                <Link
                  href="/help"
                  className={cn(
                    'text-[13px] xl:text-[14px] font-medium transition-colors py-1 whitespace-nowrap',
                    pathname === '/help' || pathname.startsWith('/help/')
                      ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary',
                  )}
                >
                  {t('help.title')}
                </Link>
              </div>

              {/* 인증 필요 메뉴 / Auth-only nav items */}
              <div className="contents auth-show">
                <Link
                  href="/portfolio"
                  className={cn(
                    'text-[13px] xl:text-[14px] font-medium transition-colors py-1 whitespace-nowrap',
                    pathname === '/portfolio' || pathname.startsWith('/portfolio/')
                      ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary',
                  )}
                >
                  {t('nav.portfolio')}
                </Link>
                <Link
                  href="/orders"
                  className={cn(
                    'text-[13px] xl:text-[14px] font-medium transition-colors py-1 whitespace-nowrap',
                    pathname === '/orders' || pathname.startsWith('/orders/')
                      ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary',
                  )}
                >
                  {t('nav.orders')}
                </Link>
                <Link
                  href="/leaderboard"
                  className={cn(
                    'text-[13px] xl:text-[14px] font-medium transition-colors py-1 whitespace-nowrap',
                    pathname === '/leaderboard' || pathname.startsWith('/leaderboard/')
                      ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary',
                  )}
                >
                  {t('nav.leaderboard')}
                </Link>
                <Link
                  href="/announcements"
                  className={cn(
                    'text-[13px] xl:text-[14px] font-medium transition-colors py-1 whitespace-nowrap',
                    pathname === '/announcements' || pathname.startsWith('/announcements/')
                      ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary',
                  )}
                >
                  {t('nav.announcements')}
                </Link>
                <Link
                  href="/community"
                  className={cn(
                    'text-[13px] xl:text-[14px] font-medium transition-colors py-1 whitespace-nowrap',
                    pathname === '/community' || pathname.startsWith('/community/')
                      ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary',
                  )}
                >
                  {t('nav.community')}
                </Link>
              </div>
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

            {/* 인증 시: 알림 + 사용자명 + 로그아웃 / When authed: bell + username + logout */}
            <div className="auth-show">
              <div className="lg:hidden flex items-center gap-1">
                <div className="relative">
                  <NotificationBell />
                </div>
                <ChatButton />
              </div>
              <div className="hidden lg:flex items-center gap-3">
                <div className="relative">
                  <NotificationBell />
                </div>
                <ChatButton />
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] text-text-secondary font-medium hover:text-text-primary hover:bg-bg-secondary transition-colors min-w-[80px] justify-center"
                    suppressHydrationWarning
                  >
                    {user?.name || user?.username}
                    <ChevronDown className={cn('w-3.5 h-3.5 text-text-quaternary transition-transform', userMenuOpen && 'rotate-180')} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-[200px] bg-bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden">
                      {/* 관리자 전용 메뉴 / Admin-only menu items */}
                      {isAdmin && (
                        <>
                          <div className="mx-3 mt-2 mb-1 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                            Admin
                          </div>
                          <div className="mx-2 mb-1 rounded-lg border border-accent/20 bg-accent/5 overflow-hidden">
                            <Link
                              href="/admin/users"
                              className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] font-medium text-text-primary hover:bg-accent/10 transition-colors"
                            >
                              <Users className="w-4 h-4 text-accent" />
                              {t('nav.userManagement')}
                            </Link>
                            <Link
                              href="/admin/stats"
                              className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] font-medium text-text-primary hover:bg-accent/10 transition-colors"
                            >
                              <BarChart3 className="w-4 h-4 text-accent" />
                              {t('nav.statistics')}
                            </Link>
                            <Link
                              href="/admin/audit"
                              className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] font-medium text-text-primary hover:bg-accent/10 transition-colors"
                            >
                              <FileText className="w-4 h-4 text-accent" />
                              {t('nav.audit')}
                            </Link>
                            <Link
                              href="/admin/health"
                              className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] font-medium text-text-primary hover:bg-accent/10 transition-colors"
                            >
                              <Activity className="w-4 h-4 text-accent" />
                              {t('nav.health')}
                            </Link>
                            <Link
                              href="/admin/settings"
                              className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] font-medium text-text-primary hover:bg-accent/10 transition-colors"
                            >
                              <Settings className="w-4 h-4 text-accent" />
                              {t('nav.settings')}
                            </Link>
                          </div>
                          <div className="border-t border-border my-1" />
                        </>
                      )}
                      <Link
                        href="/mypage"
                        className="flex items-center gap-3 w-full px-4 py-3 text-[13px] font-medium text-text-primary hover:bg-bg-tertiary transition-colors"
                      >
                        <User className="w-4 h-4 text-text-tertiary" />
                        {t('nav.mypage')}
                      </Link>
                      <Link
                        href="/help"
                        className="flex items-center gap-3 w-full px-4 py-3 text-[13px] font-medium text-text-primary hover:bg-bg-tertiary transition-colors"
                      >
                        <HelpCircle className="w-4 h-4 text-text-tertiary" />
                        {t('nav.help')}
                      </Link>
                      <div className="border-t border-border" />
                      <button
                        onClick={() => { toggleTheme(); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[13px] font-medium text-text-primary hover:bg-bg-tertiary transition-colors"
                      >
                        {theme === 'dark' ? (
                          <Sun className="w-4 h-4 text-warning" />
                        ) : (
                          <Moon className="w-4 h-4 text-accent" />
                        )}
                        {theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}
                      </button>
                      <button
                        onClick={() => { toggleLocale(); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[13px] font-medium text-text-primary hover:bg-bg-tertiary transition-colors"
                      >
                        <Globe className="w-4 h-4 text-accent" />
                        {locale === 'ko' ? 'English' : '한국어'}
                      </button>
                      <div className="border-t border-border" />
                      <button
                        onClick={() => { setUserMenuOpen(false); setLogoutModalOpen(true); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[13px] font-medium text-danger hover:bg-bg-tertiary transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 비인증 시: 로그인 버튼 / When not authed: login button */}
            <div className="auth-hide">
              <Link
                href="/login"
                className="hidden lg:inline-flex h-10 px-6 items-center text-[14px] font-bold text-white bg-accent rounded-xl hover:bg-accent/90 transition-colors"
              >
                {t('nav.login')}
              </Link>
              <Link
                href="/login"
                className="lg:hidden px-3 py-2 text-[13px] font-bold text-accent"
              >
                {t('nav.login')}
              </Link>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-3 text-text-secondary hover:text-text-primary transition-colors"
              aria-label={t('nav.menu')}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 사이드 메뉴 (열릴 때만 렌더, hydration 이후이므로 조건부 OK) */}
      {/* Mobile side menu: flex column layout to prevent scrolling */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-0 right-0 w-[280px] md:w-[340px] h-full max-h-[100dvh] bg-bg-primary border-l border-border animate-slide-in-right flex flex-col">
            {/* 헤더 / Header */}
            <div className="flex items-center justify-between px-5 h-[52px] border-b border-border shrink-0">
              <span className="text-[15px] font-bold text-text-primary">{t('nav.menu')}</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-text-tertiary hover:text-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 네비게이션 / Navigation */}
            <nav className="flex-1 px-3 py-3" role="navigation" aria-label="Mobile navigation">
              <div className="space-y-0.5">
                {mobileNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium rounded-lg transition-colors',
                      pathname === item.href || pathname.startsWith(item.href + '/')
                        ? 'text-text-primary bg-bg-secondary'
                        : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/50',
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* 관리자 메뉴 - 2열 그리드 / Admin menu - 2-column grid */}
              {mobileAdminItems.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-accent">Admin</div>
                  <div className="flex flex-col gap-0.5">
                    {mobileAdminItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors',
                          pathname === item.href || pathname.startsWith(item.href + '/')
                            ? 'text-accent bg-accent/10'
                            : 'text-text-tertiary hover:text-accent hover:bg-accent/5',
                        )}
                      >
                        <item.icon className="w-3.5 h-3.5" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </nav>

            {/* 하단 영역 / Bottom section */}
            <div className="shrink-0 px-3 pb-4 pt-2 border-t border-border">
              {isAuthenticated ? (
                <div className="space-y-2">
                  {/* 유저 정보 + 마이페이지/도움말 / User info + mypage/help */}
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <User className="w-4 h-4 text-text-tertiary shrink-0" />
                    <span className="text-[13px] font-semibold text-text-primary truncate flex-1">{user?.name || user?.username}</span>
                    <Link href="/mypage" className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors" aria-label={t('nav.mypage')}>
                      <User className="w-3.5 h-3.5" />
                    </Link>
                    <Link href="/help" className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors" aria-label={t('nav.help')}>
                      <HelpCircle className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  {/* 액션 바: 테마/언어 (아이콘) + 로그아웃 / Action bar: theme/locale (icon) + logout */}
                  <div className="flex items-center gap-1 px-1">
                    <button
                      onClick={() => { toggleTheme(); }}
                      className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                      aria-label={theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}
                    >
                      {theme === 'dark' ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { toggleLocale(); }}
                      className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                      aria-label={locale === 'ko' ? 'English' : '한국어'}
                    >
                      <Globe className="w-4 h-4" />
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => { setLogoutModalOpen(true); setMobileMenuOpen(false); }}
                      className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-danger hover:bg-danger/10 rounded-lg transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {t('nav.logout')}
                    </button>
                  </div>
                </div>
              ) : (
                <Link href="/login" className="flex items-center justify-center w-full h-11 text-[14px] font-bold text-white bg-accent rounded-xl">
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </div>
          <style jsx>{`
            @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
            .animate-slide-in-right { animation: slide-in-right 0.2s ease-out; }
            @media (prefers-reduced-motion: reduce) {
              .animate-slide-in-right { animation: none; }
            }
          `}</style>
        </div>
      )}

      {/* 로그아웃 확인 모달 / Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={() => { logout(); setLogoutModalOpen(false); router.push('/dashboard'); }}
        title={t('modal.logoutTitle')}
        message={t('modal.logoutMessage')}
        confirmLabel={t('modal.logoutConfirm')}
        confirmVariant="danger"
      />
    </>
  );
}
