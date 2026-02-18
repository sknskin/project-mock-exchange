'use client';

import Link from 'next/link';
import { cn, formatPrice, formatPercent, formatQuantity, formatCurrency } from '@/lib/format';
import type { Holding } from '@/types';

interface HoldingCardProps {
  holding: Holding;
}

function getSymbolColor(symbol: string): string {
  const colors = [
    'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-orange-600',
    'bg-pink-600', 'bg-cyan-600', 'bg-yellow-600', 'bg-indigo-600',
  ];
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function HoldingCard({ holding }: HoldingCardProps) {
  const isPositive = holding.pnl >= 0;

  return (
    <Link
      href={`/asset/${holding.symbol}`}
      className="flex items-center justify-between px-6 py-3.5 hover:bg-bg-secondary/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0',
          getSymbolColor(holding.symbol),
        )}>
          {holding.symbol.slice(0, 2)}
        </div>
        <div>
          <div className="font-semibold text-text-primary text-[14px] leading-tight">
            {holding.name}
          </div>
          <div className="text-[12px] text-text-quaternary mt-0.5">
            {formatQuantity(holding.quantity)}주 · 평균{' '}
            {formatPrice(holding.averagePrice)}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[14px] font-semibold text-text-primary tabular-nums">
          {formatCurrency(holding.value)}
        </div>
        <div
          className={cn(
            'text-[12px] font-semibold tabular-nums mt-0.5',
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
