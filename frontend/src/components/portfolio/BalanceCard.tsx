/**
 * @file 잔고 카드 컴포넌트
 * @description 현재 사용자의 가용 잔고와 총 자산을 표시합니다
 *
 * @file Balance Card Component
 * @description Displays user available balance and total assets
 */
'use client';

import { cn, formatCurrencyDisplay, formatPercent } from '@/lib/format';
import { useTranslation } from '@/hooks/useTranslation';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { Plus, Minus } from 'lucide-react';

interface BalanceCardProps {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  cashBalance: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
  totalCost?: number;
  totalMarketValue?: number;
  investedReturnPercent?: number;
  netDeposit?: number;
  onDeposit?: () => void;
  onWithdraw?: () => void;
}

export default function BalanceCard({
  totalValue,
  totalPnl,
  totalPnlPercent,
  cashBalance,
  realizedPnl = 0,
  unrealizedPnl = 0,
  totalCost = 0,
  totalMarketValue = 0,
  investedReturnPercent = 0,
  netDeposit = 0,
  onDeposit,
  onWithdraw,
}: BalanceCardProps) {
  const { t } = useTranslation();
  const { data: rateData } = useExchangeRate();
  const { display } = useCurrencyDisplay();
  const rate = rateData?.rate;
  const fmt = (v: number) => formatCurrencyDisplay(v, display, rate);
  const isPositive = totalPnl >= 0;

  return (
    <div className="py-6 sm:py-7">
      {/* 총 자산 / Total Assets */}
      <div className="text-[12px] text-text-quaternary mb-0.5">{t('portfolio.totalAssetsDesc')}</div>
      <div className="text-[13px] text-text-tertiary font-medium mb-2">{t('portfolio.totalAssets')}</div>
      <div className="text-[28px] sm:text-[32px] font-extrabold text-text-primary tabular-nums leading-tight">
        {fmt(totalValue)}
      </div>

      {/* 총 손익 / Total P&L */}
      <div className="flex items-center gap-2.5 mt-2.5">
        <span
          className={cn(
            'text-[14px] font-bold tabular-nums',
            isPositive ? 'text-rise' : 'text-fall',
          )}
        >
          {isPositive ? '+' : ''}
          {fmt(totalPnl)}
        </span>
        <span
          className={cn(
            'text-[12px] font-bold px-2 py-0.5 rounded-lg',
            isPositive ? 'bg-rise/12 text-rise' : 'bg-fall/12 text-fall',
          )}
        >
          {formatPercent(totalPnlPercent)}
        </span>
        <span className="text-[11px] text-text-quaternary">
          {t('portfolio.totalReturnDesc')}
        </span>
      </div>

      {/* 상세 항목 / Detail Items */}
      <div className="mt-6 pt-4 border-t border-border/50 space-y-3">
        {/* 순 투자 원금 / Net Deposit */}
        {netDeposit > 0 && (
          <div className="flex justify-between text-[14px]">
            <div>
              <span className="text-text-tertiary">{t('portfolio.netDeposit')}</span>
              <span className="text-[11px] text-text-quaternary ml-1.5">{t('portfolio.netDepositDesc')}</span>
            </div>
            <span className="text-text-primary font-bold tabular-nums">
              {fmt(netDeposit)}
            </span>
          </div>
        )}

        {/* 예수금 / Cash Balance */}
        <div className="flex justify-between items-center text-[14px]">
          <span className="text-text-tertiary">{t('portfolio.cashBalance')}</span>
          <div className="flex items-center gap-2">
            <span className="text-text-primary font-bold tabular-nums">
              {fmt(cashBalance)}
            </span>
            <div className="flex items-center gap-1.5">
              {onDeposit && (
                <button
                  onClick={onDeposit}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/10 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {t('portfolio.deposit')}
                </button>
              )}
              {onWithdraw && (
                <button
                  onClick={onWithdraw}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold text-fall border border-fall/30 rounded-lg hover:bg-fall/10 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                  {t('portfolio.withdraw')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 투자 금액 (매입 원가) / Total Cost */}
        {totalCost > 0 && (
          <div className="flex justify-between text-[14px]">
            <span className="text-text-tertiary">{t('portfolio.totalCost')}</span>
            <span className="text-text-primary font-bold tabular-nums">
              {fmt(totalCost)}
            </span>
          </div>
        )}

        {/* 평가 금액 / Market Value */}
        {totalMarketValue > 0 && (
          <div className="flex justify-between text-[14px]">
            <span className="text-text-tertiary">{t('portfolio.totalMarketValue')}</span>
            <span className="text-text-primary font-bold tabular-nums">
              {fmt(totalMarketValue)}
            </span>
          </div>
        )}

        {/* 미실현 손익 / Unrealized P&L */}
        {(unrealizedPnl !== 0 || totalCost > 0) && (
          <div className="flex justify-between text-[14px]">
            <div>
              <span className="text-text-tertiary">{t('portfolio.unrealizedPnl')}</span>
              {investedReturnPercent !== 0 && (
                <span className={cn(
                  'text-[11px] font-bold ml-1.5',
                  investedReturnPercent >= 0 ? 'text-rise' : 'text-fall',
                )}>
                  {formatPercent(investedReturnPercent)}
                </span>
              )}
            </div>
            <span className={cn('font-bold tabular-nums', unrealizedPnl >= 0 ? 'text-rise' : 'text-fall')}>
              {unrealizedPnl >= 0 ? '+' : ''}{fmt(unrealizedPnl)}
            </span>
          </div>
        )}

        {/* 실현 손익 / Realized P&L */}
        {realizedPnl !== 0 && (
          <div className="flex justify-between text-[14px]">
            <span className="text-text-tertiary">{t('portfolio.realizedPnl')}</span>
            <span className={cn('font-bold tabular-nums', realizedPnl >= 0 ? 'text-rise' : 'text-fall')}>
              {realizedPnl >= 0 ? '+' : ''}{fmt(realizedPnl)}
            </span>
          </div>
        )}

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
