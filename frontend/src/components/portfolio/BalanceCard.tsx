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
    <div className="px-4 sm:px-6 py-6 sm:py-7">
      <div className="text-[13px] text-text-tertiary font-medium mb-1.5">총 자산</div>
      <div className="text-[26px] sm:text-[32px] font-extrabold text-text-primary tabular-nums leading-tight">
        {formatCurrency(totalValue)}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span
          className={cn(
            'text-[14px] font-bold tabular-nums',
            isPositive ? 'text-rise' : 'text-fall',
          )}
        >
          {isPositive ? '+' : ''}
          {formatCurrency(totalPnl)}
        </span>
        <span
          className={cn(
            'text-[12px] font-bold px-1.5 py-0.5 rounded-md',
            isPositive ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall',
          )}
        >
          {formatPercent(totalPnlPercent)}
        </span>
      </div>
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex justify-between text-[14px]">
          <span className="text-text-tertiary">예수금</span>
          <span className="text-text-primary font-bold tabular-nums">
            {formatCurrency(cashBalance)}
          </span>
        </div>
      </div>
    </div>
  );
}
