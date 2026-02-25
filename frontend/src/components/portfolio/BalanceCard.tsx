/**
 * @file 잔고 카드 컴포넌트
 * @description 현재 사용자의 가용 잔고와 총 자산을 표시합니다
 *
 * @file Balance Card Component
 * @description Displays user available balance and total assets
 */
'use client';

import { cn, formatCurrency, formatPercent } from '@/lib/format';
import { useTranslation } from '@/hooks/useTranslation';
import { Plus } from 'lucide-react';

interface BalanceCardProps {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  cashBalance: number;
  onDeposit?: () => void;
}

export default function BalanceCard({
  totalValue,
  totalPnl,
  totalPnlPercent,
  cashBalance,
  onDeposit,
}: BalanceCardProps) {
  const { t } = useTranslation();
  const isPositive = totalPnl >= 0;

  return (
    <div className="py-6 sm:py-7">
      <div className="text-[13px] text-text-tertiary font-medium mb-2">{t('portfolio.totalAssets')}</div>
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
      <div className="mt-6 pt-4 border-t border-border/50 space-y-3">
        <div className="flex justify-between items-center text-[14px]">
          <span className="text-text-tertiary">{t('portfolio.cashBalance')}</span>
          <div className="flex items-center gap-2">
            <span className="text-text-primary font-bold tabular-nums">
              {formatCurrency(cashBalance)}
            </span>
            {onDeposit && (
              <button
                onClick={onDeposit}
                className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/10 transition-colors"
              >
                <Plus className="w-3 h-3" />
                {t('portfolio.deposit')}
              </button>
            )}
          </div>
        </div>
        <div className="flex justify-between text-[14px]">
          <span className="text-text-tertiary">{t('portfolio.investedValue')}</span>
          <span className="text-text-primary font-bold tabular-nums">
            {formatCurrency(totalValue - cashBalance)}
          </span>
        </div>

        {/* 현금/투자 비중 바 / Cash vs Invested ratio bar */}
        {totalValue > 0 && (() => {
          const investedRatio = ((totalValue - cashBalance) / totalValue) * 100;
          const cashRatioVal = (cashBalance / totalValue) * 100;
          return (
            <div className="pt-1">
              <div className="flex items-center justify-between text-[12px] mb-1.5">
                <span className="text-text-quaternary">{t('portfolio.cashRatio')} {cashRatioVal.toFixed(1)}%</span>
                <span className="text-text-quaternary">{t('portfolio.investedRatio')} {investedRatio.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden flex">
                <div
                  className="h-full bg-accent/60 rounded-l-full transition-all"
                  style={{ width: `${cashRatioVal}%` }}
                />
                <div
                  className="h-full bg-accent rounded-r-full transition-all"
                  style={{ width: `${investedRatio}%` }}
                />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
