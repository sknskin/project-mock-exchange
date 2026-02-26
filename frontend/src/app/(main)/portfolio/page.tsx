/**
 * @file 포트폴리오 페이지
 * @description 잔고, 보유 자산, 거래 내역을 보여주는 포트폴리오 페이지
 *
 * @file Portfolio Page
 * @description Portfolio page showing balance, holdings, and transactions
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/layout/AuthGuard';
import BalanceCard from '@/components/portfolio/BalanceCard';
import HoldingCard from '@/components/portfolio/HoldingCard';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import BottomSheet from '@/components/ui/BottomSheet';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Skeleton from '@/components/ui/Skeleton';
import { usePortfolio, useDeposit, useWithdraw } from '@/hooks/usePortfolio';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCurrency, formatCurrencyDisplay } from '@/lib/format';
import { Briefcase, ArrowLeftRight, ShoppingCart, LayoutDashboard } from 'lucide-react';

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { data: portfolio, isLoading } = usePortfolio();
  const { data: rateData } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const deposit = useDeposit();
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const withdraw = useWithdraw();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);

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

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;

    try {
      await withdraw.mutateAsync(amount);
      setWithdrawAmount('');
      setWithdrawOpen(false);
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
              onWithdraw={() => setWithdrawOpen(true)}
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
                <div className="py-24 flex flex-col items-center text-center">
                  <ShoppingCart className="w-10 h-10 text-text-quaternary/40 mb-3" />
                  <p className="text-text-quaternary text-[14px] whitespace-pre-line">
                    {t('portfolio.emptyHoldings')}
                  </p>
                  <Link
                    href="/dashboard"
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-accent bg-accent/10 rounded-lg hover:bg-accent/20 transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    {t('orders.goToDashboard')}
                  </Link>
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

            <div className="grid grid-cols-2 gap-2">
              {[100000, 500000, 1000000, 5000000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setDepositAmount(amount.toString())}
                  className="h-11 text-[13px] font-medium bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
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

        <BottomSheet
          isOpen={withdrawOpen}
          onClose={() => setWithdrawOpen(false)}
          title={t('portfolio.withdrawTitle')}
        >
          <div className="space-y-5">
            <div>
              <Input
                label={t('portfolio.withdrawAmount')}
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={t('portfolio.withdrawPlaceholder')}
              />
              {portfolio && (
                <p className="mt-1.5 text-[12px] text-text-quaternary">
                  {t('portfolio.availableBalance')}: {formatCurrencyDisplay(portfolio.cashBalance, currencyMode, rate)}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {[10, 25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    if (portfolio) {
                      const amount = Math.floor(portfolio.cashBalance * pct / 100);
                      setWithdrawAmount(amount.toString());
                    }
                  }}
                  className="flex-1 h-11 text-[13px] font-medium bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>

            <Button
              size="lg"
              fullWidth
              onClick={() => setWithdrawConfirmOpen(true)}
              disabled={
                withdraw.isPending ||
                !withdrawAmount ||
                parseFloat(withdrawAmount) <= 0 ||
                (portfolio ? parseFloat(withdrawAmount) > portfolio.cashBalance : true)
              }
            >
              {withdraw.isPending ? t('portfolio.withdrawing') : t('portfolio.withdraw')}
            </Button>
          </div>
        </BottomSheet>

        <ConfirmModal
          isOpen={withdrawConfirmOpen}
          onClose={() => setWithdrawConfirmOpen(false)}
          onConfirm={() => {
            setWithdrawConfirmOpen(false);
            handleWithdraw();
          }}
          title={t('portfolio.withdrawConfirmTitle')}
          message={t('portfolio.withdrawConfirmMessage').replace('${amount}', withdrawAmount ? formatCurrencyDisplay(parseFloat(withdrawAmount), currencyMode, rate) : '0')}
          confirmVariant="danger"
          loading={withdraw.isPending}
        />
      </div>
    </AuthGuard>
  );
}
