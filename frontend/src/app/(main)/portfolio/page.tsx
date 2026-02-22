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
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import BottomSheet from '@/components/ui/BottomSheet';
import Skeleton from '@/components/ui/Skeleton';
import { usePortfolio, useDeposit } from '@/hooks/usePortfolio';
import { useTranslation } from '@/hooks/useTranslation';
import { Briefcase } from 'lucide-react';

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { data: portfolio, isLoading } = usePortfolio();
  const deposit = useDeposit();
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

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
            />

            <div className="mb-6">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setDepositOpen(true)}
              >
                {t('portfolio.deposit')}
              </Button>
            </div>

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
