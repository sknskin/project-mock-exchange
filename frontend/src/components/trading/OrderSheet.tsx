/**
 * @file 주문 모달 컴포넌트
 * @description 중앙 모달로 주문 폼을 보여주는 컴포넌트
 *
 * @file Order Modal Component
 * @description Center modal showing order form
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import OrderForm from './OrderForm';
import { useTranslation } from '@/hooks/useTranslation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';
import { cn } from '@/lib/format';
import { X } from 'lucide-react';

// 주문 모달 Props / Order Sheet Props
interface OrderSheetProps {
  /** 모달 열림 여부
   * Whether modal is open */
  isOpen: boolean;
  /** 모달 닫기 콜백
   * Modal close callback */
  onClose: () => void;
  /** 종목 심볼
   * Asset symbol */
  symbol: string;
  /** 현재 가격
   * Current price */
  currentPrice: number;
  /** 초기 매수/매도 방향
   * Initial buy/sell side */
  initialSide: 'BUY' | 'SELL';
}

/** 주문 모달 — 매수/매도 토글과 주문 폼을 중앙 모달로 표시
 * Order modal — center modal with buy/sell toggle and order form */
export default function OrderSheet({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  initialSide,
}: OrderSheetProps) {
  const { t } = useTranslation();
  const [side, setSide] = useState<'BUY' | 'SELL'>(initialSide);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (isOpen) {
      setSide(initialSide);
    }
  }, [initialSide, isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="order-sheet-title" ref={modalRef}>
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-bg-elevated rounded-2xl w-full max-w-[400px] mx-4 max-h-[85vh] overflow-y-auto">
        {/* 헤더 / Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 id="order-sheet-title" className="text-[18px] font-bold text-text-primary">
            {symbol} {t('order.title')}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-3 text-text-quaternary hover:text-text-tertiary transition-colors rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* 매수/매도 토글 / Buy/Sell toggle */}
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
              {t('detail.buy')}
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
              {t('detail.sell')}
            </button>
          </div>

          <OrderForm
            symbol={symbol}
            currentPrice={currentPrice}
            side={side}
            onSuccess={onClose}
          />
        </div>
      </div>
    </div>
  );
}
