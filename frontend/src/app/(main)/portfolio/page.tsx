/**
 * @file 포트폴리오 페이지
 * @description 잔고, 보유 자산, 거래 내역을 보여주는 포트폴리오 페이지
 *
 * @file Portfolio Page
 * @description Portfolio page showing balance, holdings, and transactions
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/layout/AuthGuard';
import BalanceCard from '@/components/portfolio/BalanceCard';
import HoldingCard from '@/components/portfolio/HoldingCard';
import PortfolioAnalytics from '@/components/portfolio/PortfolioAnalytics';
import PortfolioHistoryChart from '@/components/portfolio/PortfolioHistoryChart';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import BottomSheet from '@/components/ui/BottomSheet';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Skeleton from '@/components/ui/Skeleton';
import ServiceError from '@/components/ui/ServiceError';
import { usePortfolioValuation, useDeposit, useWithdraw } from '@/hooks/usePortfolio';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import { cn, formatCurrency, formatDollar, formatCurrencyDisplay, formatPercent } from '@/lib/format';
import { useToastStore } from '@/stores/toast';
import { Briefcase, ShoppingCart, LayoutDashboard, Download, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { exportToCSV } from '@/lib/export';

type PortfolioTab = 'overview' | 'analytics';

export default function PortfolioPage() {
  const { t } = useTranslation();
  // 포트폴리오 평가액 조회 — 잔고, 보유 종목, 수익률 포함 / Portfolio valuation — includes balance, holdings, returns
  const { data: portfolio, isLoading, error: portfolioError, refetch, dataUpdatedAt } = usePortfolioValuation();
  const { query: { data: rateData } } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), new Promise((r) => setTimeout(r, 1000))]);
    setIsRefreshing(false);
  }, [refetch]);

  // 입금/출금 뮤테이션 및 BottomSheet 상태 / Deposit/withdraw mutations and BottomSheet state
  const deposit = useDeposit();
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const withdraw = useWithdraw();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);

  // 탭 전환 — overview(잔고+보유) vs analytics(차트 분석) / Tab switch — overview (balance+holdings) vs analytics (charts)
  const [activeTab, setActiveTabRaw] = useState<PortfolioTab>('overview');
  const setActiveTab = useCallback((v: PortfolioTab) => { setActiveTabRaw(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  /**
   * 마지막 갱신 시간 표시 — 분 단위 갱신이므로 60초 간격으로 충분
   * Last updated display — minute-level granularity, so 60s interval is sufficient
   */
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const lastUpdatedText = (() => {
    if (!dataUpdatedAt) return '';
    const diff = Math.floor((now - dataUpdatedAt) / 1000);
    if (diff < 3) return t('portfolio.justNow');
    if (diff < 60) return t('portfolio.secondsAgo').replace('{n}', String(diff));
    return t('portfolio.minutesAgo').replace('{n}', String(Math.floor(diff / 60)));
  })();

  const rate = rateData?.rate ?? 0;

  /**
   * 입력값을 백엔드(KRW 기준)로 변환 — 백엔드 API는 항상 KRW 단위를 기대
   * USD 모드에서 사용자가 $100 입력 시 → 100 * 환율 = KRW 금액으로 전환
   *
   * Convert user input to backend unit (KRW-based) — backend API always expects KRW amounts
   * When user enters $100 in USD mode → 100 * rate = KRW amount
   */
  const toBackendAmount = (input: number) =>
    currencyMode === 'original' && rate > 0 ? input * rate : input;

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;

    try {
      await deposit.mutateAsync(toBackendAmount(amount));
      setDepositAmount('');
      setDepositOpen(false);
      useToastStore.getState().addToast(t('portfolio.depositSuccess'), 'success');
    } catch {
      // Error handled by query client
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;

    try {
      await withdraw.mutateAsync(toBackendAmount(amount));
      setWithdrawAmount('');
      setWithdrawOpen(false);
      useToastStore.getState().addToast(t('portfolio.withdrawSuccess'), 'success');
    } catch {
      // Error handled by query client
    }
  };

  // 통화 모드별 금액 버튼 — USD: $100~$10K, KRW: 100만~1억 / Amount buttons per currency mode — USD: $100-$10K, KRW: 1M-100M
  const amountButtons = currencyMode === 'original'
    ? [100, 1000, 5000, 10000]
    : [1000000, 5000000, 10000000, 100000000];

  const formatAmountButton = (amount: number) => {
    if (currencyMode === 'original') {
      return `$${amount.toLocaleString('en-US')}`;
    }
    return amount >= 100000000
      ? `${(amount / 100000000).toFixed(0)}${t('portfolio.hundredMillion')}`
      : `${(amount / 10000).toFixed(0)}${t('portfolio.tenThousand')}`;
  };

  // 출금 가능 잔액을 현재 통화 모드 단위로 변환 / Available balance in current currency unit
  const availableInCurrentUnit = portfolio
    ? (currencyMode === 'original' && rate > 0 ? portfolio.cashBalance / rate : portfolio.cashBalance)
    : 0;

  return (
    <AuthGuard>
      <div>
        <div className="py-6 flex items-center justify-between h-[88px]">
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-accent" />
            <h1 className="text-[20px] font-extrabold text-text-primary">{t('nav.portfolio')}</h1>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdatedText && (
              <span className="text-[11px] text-text-quaternary tabular-nums">
                {lastUpdatedText}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                'flex items-center justify-center gap-2 h-10 min-w-[120px] px-4 rounded-xl text-[13px] font-semibold transition-all duration-150 border btn-outline',
                isRefreshing
                  ? 'border-border text-text-quaternary cursor-not-allowed'
                  : 'border-accent/30 text-accent hover:bg-accent/10',
              )}
            >
              <RefreshCw className={cn('w-4 h-4 shrink-0', isRefreshing && 'animate-spin')} />
              {t('portfolio.refresh')}
            </button>
          </div>
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
                {/* 환율 정보 / Exchange Rate — 최상단 */}
                <ExchangeRateBar />

                <BalanceCard
                  totalValue={portfolio.totalValue}
                  totalPnl={portfolio.totalPnl}
                  totalPnlPercent={portfolio.totalPnlPercent}
                  cashBalance={portfolio.cashBalance}
                  realizedPnl={portfolio.realizedPnl}
                  unrealizedPnl={portfolio.unrealizedPnl}
                  totalCost={portfolio.totalCost}
                  totalMarketValue={portfolio.totalMarketValue}
                  investedReturnPercent={portfolio.investedReturnPercent}
                  netDeposit={portfolio.netDeposit}
                  onDeposit={() => setDepositOpen(true)}
                  onWithdraw={() => setWithdrawOpen(true)}
                />

                {/* 포트폴리오 가치 히스토리 차트 / Portfolio value history chart */}
                <PortfolioHistoryChart totalValue={portfolio.totalValue} />

                {/* 보유 종목 시세 요약 — 평가금액 기준 내림차순 정렬 / Holdings Market Pulse — sorted by valuation descending */}
                {portfolio.holdings.length > 0 && (
                  <div className="py-4 border-b border-border/60">
                    <h2 className="text-[14px] font-bold text-text-secondary mb-3">
                      {t('portfolio.marketPulse')}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {portfolio.holdings
                        .slice()
                        .sort((a, b) => b.value - a.value)
                        .map((holding) => {
                          const isUp = holding.pnl >= 0;
                          const weight = portfolio.totalValue > 0
                            ? ((holding.value / portfolio.totalValue) * 100).toFixed(1)
                            : '0.0';
                          return (
                            <Link
                              key={holding.symbol}
                              href={`/asset/${encodeURIComponent(holding.symbol)}`}
                              className="flex items-center gap-3 p-3 rounded-xl bg-bg-secondary hover:bg-bg-tertiary transition-colors"
                            >
                              <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                                isUp ? 'bg-rise/12' : 'bg-fall/12',
                              )}>
                                {isUp
                                  ? <TrendingUp className="w-4 h-4 text-rise" />
                                  : <TrendingDown className="w-4 h-4 text-fall" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-[13px] font-semibold text-text-primary truncate">
                                    {holding.name || holding.symbol}
                                  </span>
                                  <span className="text-[13px] font-bold text-text-primary tabular-nums ml-2 shrink-0">
                                    {formatCurrencyDisplay(holding.currentPrice, currencyMode, rate)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                  <span className="text-[11px] text-text-quaternary">
                                    {t('portfolio.portfolioWeight')} {weight}%
                                  </span>
                                  <span className={cn(
                                    'text-[12px] font-bold tabular-nums',
                                    isUp ? 'text-rise' : 'text-fall',
                                  )}>
                                    {formatPercent(holding.pnlPercent)}
                                  </span>
                                </div>
                              </div>
                            </Link>
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
                          const _rate = rateData?.rate;
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

        {/* 입금 바텀시트 — 금액 입력 + 빠른 금액 버튼 / Deposit BottomSheet — amount input + quick amount buttons */}
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
            <div className="grid grid-cols-4 gap-2">
              {amountButtons.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setDepositAmount((prev) => {
                    const current = parseFloat(prev || '0');
                    return (current + amount).toString();
                  })}
                  className="h-11 text-[13px] font-medium bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
                >
                  {formatAmountButton(amount)}
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

        {/* 출금 바텀시트 — 금액 입력 + 빠른 금액 + 잔액 비율(%) 버튼 / Withdraw BottomSheet — amount input + quick amount + balance % buttons */}
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
                  {t('portfolio.availableBalance')}: {currencyMode === 'original' && rate > 0
                    ? formatDollar(availableInCurrentUnit)
                    : formatCurrency(portfolio.cashBalance)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {amountButtons.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setWithdrawAmount((prev) => {
                    const current = parseFloat(prev || '0');
                    return (current + amount).toString();
                  })}
                  className="h-11 text-[13px] font-medium bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
                >
                  {formatAmountButton(amount)}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {[10, 25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    if (portfolio) {
                      const amount = Math.floor(availableInCurrentUnit * pct / 100);
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
                (portfolio ? parseFloat(withdrawAmount) > availableInCurrentUnit : true)
              }
            >
              {withdraw.isPending ? t('portfolio.withdrawing') : t('portfolio.withdraw')}
            </Button>
          </div>
        </BottomSheet>

        {/* 출금 최종 확인 모달 — 금액 표시 후 위험 확인 / Withdraw final confirmation modal — shows amount with danger variant */}
        <ConfirmModal
          isOpen={withdrawConfirmOpen}
          onClose={() => setWithdrawConfirmOpen(false)}
          onConfirm={() => {
            setWithdrawConfirmOpen(false);
            handleWithdraw();
          }}
          title={t('portfolio.withdrawConfirmTitle')}
          message={t('portfolio.withdrawConfirmMessage').replace('${amount}', withdrawAmount
            ? (currencyMode === 'original' && rate > 0
              ? formatDollar(parseFloat(withdrawAmount))
              : formatCurrency(parseFloat(withdrawAmount)))
            : '0')}
          confirmVariant="danger"
          loading={withdraw.isPending}
        />
      </div>
    </AuthGuard>
  );
}
