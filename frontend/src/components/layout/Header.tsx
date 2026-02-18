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

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-bg-primary border-b border-border">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-7">
            <Link href="/" className="flex items-center">
              <span className="font-extrabold text-[18px] text-text-primary tracking-tight">
                MockX
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-[15px] font-medium transition-colors',
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

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-text-quaternary">
              <Search className="w-4 h-4" />
              <span className="text-[13px]">
                <kbd className="px-1.5 py-0.5 text-[11px] border border-border rounded text-text-tertiary font-mono">/</kbd>
                {' '}를 눌러 검색하세요
              </span>
            </div>

            {isAuthenticated ? (
              <>
                <span className="text-[13px] text-text-secondary font-medium hidden sm:block">
                  {user?.username}
                </span>
                <button
                  onClick={logout}
                  className="p-2 text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden md:inline-flex h-9 px-5 items-center text-[14px] font-bold text-white bg-[#333339] rounded-lg hover:bg-[#3E3E45] transition-colors"
              >
                로그인
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
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
            <div className="flex items-center justify-between px-5 h-14 border-b border-border">
              <span className="text-[15px] font-bold text-text-primary">메뉴</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-text-tertiary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="px-3 py-4 space-y-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center px-4 py-3 text-[15px] font-medium rounded-lg transition-colors',
                    pathname === item.href
                      ? 'text-text-primary bg-bg-secondary'
                      : 'text-text-tertiary hover:text-text-primary',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-5 pt-4 mt-2 border-t border-border">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <div className="text-[14px] text-text-secondary">
                    <span className="text-text-primary font-bold">{user?.username}</span> 님
                  </div>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-4 py-3 text-[14px] font-medium text-text-tertiary bg-bg-secondary rounded-lg"
                  >
                    <LogOut className="w-4 h-4" /> 로그아웃
                  </button>
                </div>
              ) : (
                <Link href="/login" className="flex items-center justify-center w-full py-3 text-[14px] font-bold text-white bg-[#333339] rounded-lg">
                  로그인
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
