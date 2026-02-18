'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import { LogOut, Search, Menu, X } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: t('nav.home') },
    { href: '/portfolio', label: t('nav.portfolio') },
    { href: '/orders', label: t('nav.orders') },
    { href: '/leaderboard', label: t('nav.leaderboard') },
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
            <Link href="/" className="flex items-center">
              <span className="font-extrabold text-[20px] text-text-primary tracking-tight">
                VirtuEx
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-[15px] font-medium transition-colors py-1',
                    pathname === item.href
                      ? 'text-text-primary'
                      : 'text-text-tertiary hover:text-text-primary',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden lg:flex items-center gap-2.5 text-text-quaternary">
              <Search className="w-4 h-4" />
              <span className="text-[13px]">
                <kbd className="px-1.5 py-0.5 text-[11px] border border-border rounded text-text-tertiary font-mono">/</kbd>
                {t('nav.search')}
              </span>
            </div>

            {isAuthenticated ? (
              <>
                <span className="text-[13px] text-text-secondary font-medium hidden sm:block">
                  {user?.username}
                </span>
                <button
                  onClick={logout}
                  className="p-2.5 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden md:inline-flex h-10 px-6 items-center text-[14px] font-bold text-white bg-accent rounded-lg hover:bg-accent/85 transition-colors"
              >
                {t('nav.login')}
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 text-text-secondary hover:text-text-primary transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
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
                    'flex items-center px-4 py-3.5 text-[15px] font-medium rounded-xl transition-colors',
                    pathname === item.href
                      ? 'text-text-primary bg-bg-secondary'
                      : 'text-text-tertiary hover:text-text-primary',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-6 pt-4 mt-2 border-t border-border">
              {isAuthenticated ? (
                <div className="space-y-4">
                  <div className="text-[14px] text-text-secondary">
                    <span className="text-text-primary font-bold">{user?.username}</span>
                  </div>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-3.5 text-[14px] font-medium text-text-tertiary bg-bg-secondary rounded-xl"
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
    </>
  );
}
