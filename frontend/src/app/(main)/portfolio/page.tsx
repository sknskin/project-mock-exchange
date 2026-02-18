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

export default function PortfolioPage() {
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
        {isLoading || !portfolio ? (
          <div className="px-6 py-7 space-y-4">
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

            <div className="px-6 mb-5">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setDepositOpen(true)}
              >
                입금하기
              </Button>
            </div>

            <div className="border-t border-border">
              <div className="px-6 py-4">
                <h2 className="text-[14px] font-bold text-text-secondary">
                  보유 자산 ({portfolio.holdings.length})
                </h2>
              </div>

              {portfolio.holdings.length > 0 ? (
                portfolio.holdings.map((holding) => (
                  <HoldingCard key={holding.symbol} holding={holding} />
                ))
              ) : (
                <div className="py-20 text-center text-text-quaternary text-[14px]">
                  보유한 자산이 없습니다
                </div>
              )}
            </div>
          </>
        )}

        <BottomSheet
          isOpen={depositOpen}
          onClose={() => setDepositOpen(false)}
          title="입금"
        >
          <div className="space-y-5">
            <Input
              label="입금 금액 (원)"
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="입금할 금액을 입력하세요"
            />

            <div className="flex gap-2">
              {[100000, 500000, 1000000, 5000000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setDepositAmount(amount.toString())}
                  className="flex-1 py-2.5 text-[13px] font-bold bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
                >
                  {(amount / 10000).toFixed(0)}만
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
              {deposit.isPending ? '입금 중...' : '입금하기'}
            </Button>
          </div>
        </BottomSheet>
      </div>
    </AuthGuard>
  );
}
