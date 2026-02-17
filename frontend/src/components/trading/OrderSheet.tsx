'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import OrderForm from './OrderForm';
import { cn } from '@/lib/format';

interface OrderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
}

export default function OrderSheet({
  isOpen,
  onClose,
  symbol,
  currentPrice,
}: OrderSheetProps) {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`${symbol} 주문`}>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSide('BUY')}
          className={cn(
            'flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors',
            side === 'BUY'
              ? 'bg-rise text-white'
              : 'bg-bg-tertiary text-text-secondary',
          )}
        >
          매수
        </button>
        <button
          onClick={() => setSide('SELL')}
          className={cn(
            'flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors',
            side === 'SELL'
              ? 'bg-fall text-white'
              : 'bg-bg-tertiary text-text-secondary',
          )}
        >
          매도
        </button>
      </div>

      <OrderForm
        symbol={symbol}
        currentPrice={currentPrice}
        side={side}
        onSuccess={onClose}
      />
    </BottomSheet>
  );
}
