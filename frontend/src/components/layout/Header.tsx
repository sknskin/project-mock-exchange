'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/format';
import { LogOut, Search } from 'lucide-react';

const navItems = [
  { href: '/', label: '홈' },
  { href: '/portfolio', label: '내 투자' },
  { href: '/orders', label: '주문내역' },
  { href: '/leaderboard', label: '리더보드' },
];

export default function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 bg-bg-primary border-b border-border">
      <div className="max-w-[1280px] mx-auto px-6 h-[56px] flex items-center justify-between">
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
                  'px-3 py-1.5 text-[15px] font-semibold transition-colors',
                  pathname === item.href
                    ? 'text-text-primary'
                    : 'text-text-tertiary hover:text-text-secondary',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Search hint - Toss style */}
          <div className="hidden md:flex items-center gap-2 text-text-quaternary">
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
                className="p-2 text-text-tertiary hover:text-text-secondary transition-colors rounded-lg hover:bg-bg-secondary"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-1.5 text-[13px] font-bold text-white bg-accent rounded-full hover:opacity-90 transition-opacity"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
