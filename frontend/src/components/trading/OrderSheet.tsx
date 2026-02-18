/**
 * @file 주문 시트 컴포넌트
 * @description 모바일에서 바텀시트로 주문 폼을 보여주는 컴포넌트
 *
 * @file Order Sheet Component
 * @description Bottom sheet showing order form on mobile devices
 */
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
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSide('BUY')}
          className={cn(
            'flex-1 h-11 text-[14px] font-bold rounded-lg transition-colors',
            side === 'BUY'
              ? 'bg-rise text-white'
              : 'bg-bg-secondary text-text-quaternary hover:text-text-tertiary',
          )}
        >
          매수
        </button>
        <button
          onClick={() => setSide('SELL')}
          className={cn(
            'flex-1 h-11 text-[14px] font-bold rounded-lg transition-colors',
            side === 'SELL'
              ? 'bg-fall text-white'
              : 'bg-bg-secondary text-text-quaternary hover:text-text-tertiary',
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
