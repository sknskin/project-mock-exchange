'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/format';
import { TrendingUp, LogOut } from 'lucide-react';

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
    <header className="sticky top-0 z-40 bg-bg-primary/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-accent" />
            <span className="font-bold text-lg text-text-primary hidden sm:block">
              MockX
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  pathname === item.href
                    ? 'text-text-primary bg-bg-tertiary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-text-secondary hidden sm:block">
                {user?.username}
              </span>
              <button
                onClick={logout}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-blue-600 transition-colors"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
