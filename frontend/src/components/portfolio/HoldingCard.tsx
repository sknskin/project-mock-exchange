'use client';

import Link from 'next/link';
import { cn, formatPrice, formatPercent, formatQuantity, formatCurrency } from '@/lib/format';
import type { Holding } from '@/types';

interface HoldingCardProps {
  holding: Holding;
}

export default function HoldingCard({ holding }: HoldingCardProps) {
  const isPositive = holding.pnl >= 0;

  return (
    <Link
      href={`/asset/${holding.symbol}`}
      className="flex items-center justify-between px-5 py-3.5 hover:bg-bg-secondary transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-sm font-bold text-accent">
          {holding.symbol.slice(0, 2)}
        </div>
        <div>
          <div className="font-medium text-text-primary text-sm">
            {holding.name}
          </div>
          <div className="text-xs text-text-secondary">
            {formatQuantity(holding.quantity)}주 · 평균{' '}
            {formatPrice(holding.averagePrice)}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-text-primary tabular-nums">
          {formatCurrency(holding.value)}
        </div>
        <div
          className={cn(
            'text-xs tabular-nums',
            isPositive ? 'text-rise' : 'text-fall',
          )}
        >
          {isPositive ? '+' : ''}
          {formatPrice(holding.pnl)} ({formatPercent(holding.pnlPercent)})
        </div>
      </div>
    </Link>
  );
}
