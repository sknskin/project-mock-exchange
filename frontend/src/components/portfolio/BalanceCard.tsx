/**
 * @file 잔고 카드 컴포넌트
 * @description 현재 사용자의 가용 잔고와 총 자산을 표시합니다
 *
 * @file Balance Card Component
 * @description Displays user available balance and total assets
 */
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
    <div className="py-6 sm:py-7">
      <div className="text-[13px] text-text-tertiary font-medium mb-2">총 자산</div>
      <div className="text-[28px] sm:text-[32px] font-extrabold text-text-primary tabular-nums leading-tight">
        {formatCurrency(totalValue)}
      </div>
      <div className="flex items-center gap-2.5 mt-2.5">
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
            'text-[12px] font-bold px-2 py-0.5 rounded-lg',
            isPositive ? 'bg-rise/12 text-rise' : 'bg-fall/12 text-fall',
          )}
        >
          {formatPercent(totalPnlPercent)}
        </span>
      </div>
      <div className="mt-6 pt-4 border-t border-border/50">
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
