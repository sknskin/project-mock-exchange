'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/format';
import { LogOut, Search, Menu, X } from 'lucide-react';

const navItems = [
  { href: '/', label: '홈' },
  { href: '/portfolio', label: '내 투자' },
  { href: '/orders', label: '주문내역' },
  { href: '/leaderboard', label: '리더보드' },
];

export default function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-bg-primary/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Left: Logo + Desktop Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <span className="font-extrabold text-[18px] text-text-primary tracking-tight">
                MockX
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3.5 py-2 text-[14px] font-semibold rounded-lg transition-colors',
                    pathname === item.href
                      ? 'text-text-primary bg-bg-secondary/60'
                      : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/40',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: Search hint + Auth + Hamburger */}
          <div className="flex items-center gap-2">
            {/* Search hint - desktop only */}
            <div className="hidden lg:flex items-center gap-2 text-text-quaternary mr-2">
              <Search className="w-4 h-4" />
              <span className="text-[13px]">
                <kbd className="px-1.5 py-0.5 text-[11px] border border-border rounded text-text-tertiary font-mono">/</kbd>
                {' '}를 눌러 검색
              </span>
            </div>

            {isAuthenticated ? (
              <>
                <span className="text-[13px] text-text-secondary font-medium hidden sm:block mr-1">
                  {user?.username}
                </span>
                <button
                  onClick={logout}
                  className="p-2 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary/60"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden md:inline-flex px-5 py-2 text-[13px] font-bold text-white bg-accent rounded-full hover:brightness-110 transition-all"
              >
                로그인
              </Link>
            )}

            {/* Hamburger - mobile/tablet */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary/60"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute top-0 right-0 w-[280px] h-full bg-bg-primary border-l border-border animate-slide-in-right">
            {/* Close button */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-border">
              <span className="text-[15px] font-bold text-text-primary">메뉴</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-text-tertiary hover:text-text-primary rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="px-3 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center px-4 py-3 text-[15px] font-semibold rounded-xl transition-colors',
                    pathname === item.href
                      ? 'text-text-primary bg-bg-secondary'
                      : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/60',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Auth section */}
            <div className="px-5 pt-4 mt-2 border-t border-border">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <div className="text-[14px] text-text-secondary">
                    <span className="text-text-primary font-bold">{user?.username}</span> 님
                  </div>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-4 py-3 text-[14px] font-semibold text-text-tertiary bg-bg-secondary rounded-xl hover:bg-bg-tertiary transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center justify-center w-full py-3 text-[14px] font-bold text-white bg-accent rounded-xl hover:brightness-110 transition-all"
                >
                  로그인
                </Link>
              )}
            </div>
          </div>

          <style jsx>{`
            @keyframes slide-in-right {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            .animate-slide-in-right {
              animation: slide-in-right 0.2s ease-out;
            }
          `}</style>
        </div>
      )}
    </>
  );
}
