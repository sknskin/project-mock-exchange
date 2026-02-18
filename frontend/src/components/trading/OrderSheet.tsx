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
      <div className="flex bg-bg-secondary rounded-xl p-1 gap-1 mb-6">
        <button
          onClick={() => setSide('BUY')}
          className={cn(
            'flex-1 h-10 text-[14px] font-bold rounded-lg transition-all duration-200 active:scale-[0.97]',
            side === 'BUY'
              ? 'bg-rise text-white shadow-[0_2px_8px_rgba(240,68,82,0.3)]'
              : 'text-text-quaternary hover:text-text-tertiary',
          )}
        >
          매수
        </button>
        <button
          onClick={() => setSide('SELL')}
          className={cn(
            'flex-1 h-10 text-[14px] font-bold rounded-lg transition-all duration-200 active:scale-[0.97]',
            side === 'SELL'
              ? 'bg-fall text-white shadow-[0_2px_8px_rgba(49,130,246,0.3)]'
              : 'text-text-quaternary hover:text-text-tertiary',
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
