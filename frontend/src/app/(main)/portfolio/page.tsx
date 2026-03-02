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
import PortfolioAnalytics from '@/components/portfolio/PortfolioAnalytics';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import BottomSheet from '@/components/ui/BottomSheet';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Skeleton from '@/components/ui/Skeleton';
import ServiceError from '@/components/ui/ServiceError';
import { usePortfolio, useDeposit, useWithdraw } from '@/hooks/usePortfolio';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import { cn, formatCurrency, formatCurrencyDisplay } from '@/lib/format';
import { Briefcase, ArrowLeftRight, ShoppingCart, LayoutDashboard, Download } from 'lucide-react';
import { exportToCSV } from '@/lib/export';

type PortfolioTab = 'overview' | 'analytics';

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { data: portfolio, isLoading, error: portfolioError, refetch } = usePortfolio();
  const { data: rateData } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const deposit = useDeposit();
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const withdraw = useWithdraw();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PortfolioTab>('overview');

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
        {/* 탭 네비게이션 / Tab Navigation */}
        <div className="flex gap-1 border-b border-border/60 mb-2">
          {(['overview', 'analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2.5 text-[14px] font-semibold transition-colors relative',
                activeTab === tab
                  ? 'text-accent'
                  : 'text-text-quaternary hover:text-text-secondary',
              )}
            >
              {tab === 'overview' ? t('portfolio.tab.overview') : t('portfolio.tab.analytics')}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-full" />
              )}
            </button>
          ))}
        </div>

        {portfolioError ? (
          <ServiceError onRetry={refetch} />
        ) : isLoading || !portfolio ? (
          <div className="space-y-6">
            {/* Balance card skeleton */}
            <div className="space-y-3">
              <Skeleton className="w-20 h-3" />
              <Skeleton className="w-48 h-9" />
              <Skeleton className="w-32 h-5" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="w-24 h-10 rounded-xl" />
                <Skeleton className="w-24 h-10 rounded-xl" />
              </div>
            </div>
            {/* Exchange rate bar skeleton */}
            <Skeleton className="w-full h-10 rounded-xl" />
            {/* Holdings section skeleton */}
            <div className="space-y-3 pt-2">
              <Skeleton className="w-28 h-4" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="w-24 h-3.5" />
                    <Skeleton className="w-16 h-2.5" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="w-20 h-3.5 ml-auto" />
                    <Skeleton className="w-14 h-2.5 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' ? (
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
                  <div className="py-4 flex items-center justify-between">
                    <h2 className="text-[14px] font-bold text-text-secondary">
                      {t('portfolio.holdings')} ({portfolio.holdings.length})
                    </h2>
                    {portfolio.holdings.length > 0 && (
                      <button
                        onClick={() => {
                          const rate = rateData?.rate;
                          exportToCSV(
                            portfolio.holdings.map((h) => ({
                              symbol: h.symbol,
                              name: h.name || h.symbol,
                              quantity: h.quantity,
                              avgPrice: h.averagePrice,
                              currentPrice: h.currentPrice,
                              value: h.value,
                              pnl: h.pnl,
                              pnlPercent: h.pnlPercent?.toFixed(2) + '%',
                            })),
                            `holdings-${new Date().toISOString().slice(0, 10)}`,
                            [
                              { key: 'symbol', label: 'Symbol' },
                              { key: 'name', label: 'Name' },
                              { key: 'quantity', label: 'Quantity' },
                              { key: 'avgPrice', label: 'Avg Price' },
                              { key: 'currentPrice', label: 'Current Price' },
                              { key: 'value', label: 'Value' },
                              { key: 'pnl', label: 'P&L' },
                              { key: 'pnlPercent', label: 'P&L %' },
                            ],
                          );
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-text-tertiary hover:text-text-primary border border-border rounded-lg hover:bg-bg-secondary transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {t('export.csv')}
                      </button>
                    )}
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
            ) : (
              <PortfolioAnalytics portfolio={portfolio} />
            )}
          </>
        )}

        <BottomSheet
          isOpen={depositOpen}
          onClose={() => setDepositOpen(false)}
          title={t('portfolio.depositTitle')}
        >
          <div className="space-y-5">
            <Input
              label={`${t('portfolio.depositAmount')} (${currencyMode === 'krw' ? 'KRW' : 'USD'})`}
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder={t('portfolio.depositPlaceholder')}
            />
            {depositAmount && parseFloat(depositAmount) > 0 && (
              <p className="text-[12px] text-text-quaternary -mt-3">
                {formatCurrencyDisplay(parseFloat(depositAmount), currencyMode, rate)}
              </p>
            )}

            <div className="grid grid-cols-4 gap-2">
              {[1000000, 5000000, 10000000, 100000000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setDepositAmount((prev) => {
                    const current = parseFloat(prev || '0');
                    return (current + amount).toString();
                  })}
                  className="h-11 text-[13px] font-medium bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
                >
                  {amount >= 100000000
                    ? `${(amount / 100000000).toFixed(0)}${t('portfolio.hundredMillion')}`
                    : `${(amount / 10000).toFixed(0)}${t('portfolio.tenThousand')}`}
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
                label={`${t('portfolio.withdrawAmount')} (${currencyMode === 'krw' ? 'KRW' : 'USD'})`}
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
              {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                <p className="mt-1 text-[12px] text-text-quaternary">
                  {formatCurrencyDisplay(parseFloat(withdrawAmount), currencyMode, rate)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1000000, 5000000, 10000000, 100000000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setWithdrawAmount((prev) => {
                    const current = parseFloat(prev || '0');
                    return (current + amount).toString();
                  })}
                  className="h-11 text-[13px] font-medium bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
                >
                  {amount >= 100000000
                    ? `${(amount / 100000000).toFixed(0)}${t('portfolio.hundredMillion')}`
                    : `${(amount / 10000).toFixed(0)}${t('portfolio.tenThousand')}`}
                </button>
              ))}
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
