/**
 * @file 포트폴리오 페이지
 * @description 잔고, 보유 자산, 거래 내역을 보여주는 포트폴리오 페이지
 *
 * @file Portfolio Page
 * @description Portfolio page showing balance, holdings, and transactions
 */
'use client';

import { useState } from 'react';
import AuthGuard from '@/components/layout/AuthGuard';
import BalanceCard from '@/components/portfolio/BalanceCard';
import HoldingCard from '@/components/portfolio/HoldingCard';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import BottomSheet from '@/components/ui/BottomSheet';
import Skeleton from '@/components/ui/Skeleton';
import { usePortfolio, useDeposit } from '@/hooks/usePortfolio';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useTranslation } from '@/hooks/useTranslation';
import { Briefcase, ArrowLeftRight } from 'lucide-react';

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { data: portfolio, isLoading } = usePortfolio();
  const { data: rateData } = useExchangeRate();
  const deposit = useDeposit();
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  // 환율 계산기 상태 (Exchange calculator state)
  const [calcAmount, setCalcAmount] = useState('');
  const [calcDirection, setCalcDirection] = useState<'krwToUsd' | 'usdToKrw'>('krwToUsd');

  const rate = rateData?.rate ?? 0;

  const calcResult = (() => {
    const amount = parseFloat(calcAmount || '0');
    if (!amount || !rate) return '';
    if (calcDirection === 'krwToUsd') {
      const usd = amount / rate;
      return '$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    const krw = Math.round(amount * rate);
    return krw.toLocaleString('ko-KR') + '원';
  })();

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;

    try {
      await deposit.mutateAsync(amount);
      setDepositAmount('');
      setDepositOpen(false);
    } catch {
      // Error handled by query client
    }
  };

  return (
    <AuthGuard>
      <div>
        <div className="py-6 flex items-center gap-2.5">
          <Briefcase className="w-5 h-5 text-accent" />
          <h1 className="text-[20px] font-extrabold text-text-primary">{t('nav.portfolio')}</h1>
        </div>
        {isLoading || !portfolio ? (
          <div className="space-y-4">
            <Skeleton className="w-16 h-3" />
            <Skeleton className="w-44 h-9" />
            <Skeleton className="w-28 h-5" />
          </div>
        ) : (
          <>
            <BalanceCard
              totalValue={portfolio.totalValue}
              totalPnl={portfolio.totalPnl}
              totalPnlPercent={portfolio.totalPnlPercent}
              cashBalance={portfolio.cashBalance}
              onDeposit={() => setDepositOpen(true)}
            />

            {/* 환율 정보 / Exchange Rate */}
            <ExchangeRateBar />

            {/* 환율 계산기 / Exchange Calculator */}
            {rate > 0 && (
              <div className="py-4 border-b border-border/60">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowLeftRight className="w-4 h-4 text-accent" />
                  <h2 className="text-[14px] font-bold text-text-secondary">
                    {t('exchange.calculator')}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      label={calcDirection === 'krwToUsd' ? t('exchange.fromKRW') : t('exchange.fromUSD')}
                      type="number"
                      value={calcAmount}
                      onChange={(e) => setCalcAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setCalcDirection((d) => d === 'krwToUsd' ? 'usdToKrw' : 'krwToUsd');
                      setCalcAmount('');
                    }}
                    className="mt-5 p-2 rounded-lg border border-border text-text-tertiary hover:text-accent hover:border-accent/50 transition-colors"
                    title={t('exchange.swap')}
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                  <div className="flex-1">
                    <div className="text-[12px] font-medium text-text-tertiary mb-1.5">
                      {t('exchange.result')}
                    </div>
                    <div className="h-11 flex items-center px-3 rounded-xl bg-bg-secondary text-[14px] font-bold text-text-primary tabular-nums">
                      {calcResult || '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 투자 비중 / Investment Weight */}
            {portfolio.holdings.length > 0 && (
              <div className="mb-6 py-4 border-b border-border/60">
                <h2 className="text-[14px] font-bold text-text-secondary mb-3">
                  {t('portfolio.investmentWeight')}
                </h2>
                <div className="space-y-2">
                  {portfolio.holdings
                    .sort((a, b) => b.value - a.value)
                    .map((holding) => {
                      const weight = portfolio.totalValue > 0
                        ? (holding.value / portfolio.totalValue) * 100
                        : 0;
                      return (
                        <div key={holding.symbol} className="flex items-center gap-3">
                          <span className="text-[13px] font-medium text-text-primary w-[100px] sm:w-[140px] truncate">
                            {holding.name || holding.symbol}
                          </span>
                          <div className="flex-1 h-5 bg-bg-tertiary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all flex items-center justify-end pr-2"
                              style={{ width: `${Math.max(weight, 3)}%` }}
                            >
                              {weight >= 8 && (
                                <span className="text-[10px] font-bold text-white">
                                  {weight.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          {weight < 8 && (
                            <span className="text-[11px] font-medium text-text-tertiary tabular-nums shrink-0">
                              {weight.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="border-t border-border/60">
              <div className="py-4">
                <h2 className="text-[14px] font-bold text-text-secondary">
                  {t('portfolio.holdings')} ({portfolio.holdings.length})
                </h2>
              </div>

              {portfolio.holdings.length > 0 ? (
                <div className="divide-y divide-border/40">
                  {portfolio.holdings.map((holding) => (
                    <HoldingCard key={holding.symbol} holding={holding} />
                  ))}
                </div>
              ) : (
                <div className="py-24 text-center text-text-quaternary text-[14px]">
                  {t('portfolio.noHoldings')}
                </div>
              )}
            </div>
          </>
        )}

        <BottomSheet
          isOpen={depositOpen}
          onClose={() => setDepositOpen(false)}
          title={t('portfolio.depositTitle')}
        >
          <div className="space-y-5">
            <Input
              label={t('portfolio.depositAmount')}
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder={t('portfolio.depositPlaceholder')}
            />

            <div className="flex gap-2">
              {[100000, 500000, 1000000, 5000000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setDepositAmount(amount.toString())}
                  className="flex-1 h-10 text-[13px] font-medium bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
                >
                  {(amount / 10000).toFixed(0)}{t('portfolio.tenThousand')}
                </button>
              ))}
            </div>

            <Button
              size="lg"
              fullWidth
              onClick={handleDeposit}
              disabled={
                deposit.isPending ||
                !depositAmount ||
                parseFloat(depositAmount) <= 0
              }
            >
              {deposit.isPending ? t('portfolio.depositing') : t('portfolio.deposit')}
            </Button>
          </div>
        </BottomSheet>
      </div>
    </AuthGuard>
  );
}
