'use client';

import { cn, formatCurrency, formatPercent } from '@/lib/format';

interface BalanceCardProps {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  cashBalance: number;
}

export default function BalanceCard({
  totalValue,
  totalPnl,
  totalPnlPercent,
  cashBalance,
}: BalanceCardProps) {
  const isPositive = totalPnl >= 0;

  return (
    <div className="px-5 py-6">
      <div className="text-sm text-text-secondary mb-1">총 자산</div>
      <div className="text-3xl font-bold text-text-primary tabular-nums">
        {formatCurrency(totalValue)}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span
          className={cn(
            'text-sm font-medium tabular-nums',
            isPositive ? 'text-rise' : 'text-fall',
          )}
        >
          {isPositive ? '+' : ''}
          {formatCurrency(totalPnl)}
        </span>
        <span
          className={cn(
            'text-xs px-1.5 py-0.5 rounded',
            isPositive ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall',
          )}
        >
          {formatPercent(totalPnlPercent)}
        </span>
      </div>
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">예수금</span>
          <span className="text-text-primary tabular-nums">
            {formatCurrency(cashBalance)}
          </span>
        </div>
      </div>
    </div>
  );
}
