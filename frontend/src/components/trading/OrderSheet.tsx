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
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setSide('BUY')}
          className={cn(
            'flex-1 py-3 text-[14px] font-bold rounded-xl transition-all duration-150',
            side === 'BUY'
              ? 'bg-rise text-white'
              : 'bg-bg-secondary text-text-quaternary',
          )}
        >
          매수
        </button>
        <button
          onClick={() => setSide('SELL')}
          className={cn(
            'flex-1 py-3 text-[14px] font-bold rounded-xl transition-all duration-150',
            side === 'SELL'
              ? 'bg-fall text-white'
              : 'bg-bg-secondary text-text-quaternary',
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
