/**
 * @file 호가창 컴포넌트
 * @description 매수/매도 주문 호가와 수량을 시각적으로 표시합니다
 *
 * @file Order Book Component
 * @description Visually displays bid/ask order prices and quantities
 */
'use client';

import { cn, formatPrice, formatQuantity } from '@/lib/format';
import { useTranslation } from '@/hooks/useTranslation';
import type { OrderBook as OrderBookType } from '@/types';

interface OrderBookProps {
  orderBook: OrderBookType;
}

export default function OrderBook({ orderBook }: OrderBookProps) {
  const { t } = useTranslation();
  const maxTotal = Math.max(
    ...orderBook.asks.map((a) => a.total),
    ...orderBook.bids.map((b) => b.total),
  );

  return (
    <div className="">
      <div className="flex text-[12px] text-text-quaternary py-2.5 font-medium">
        <span className="flex-1">{t('orderbook.price')}</span>
        <span className="flex-1 text-right">{t('orderbook.quantity')}</span>
      </div>

      {/* 매도 호가 / Asks (sell orders) */}
      <div className="space-y-px py-1">
        {[...orderBook.asks].reverse().slice(0, 8).map((ask, i) => (
          <div key={`ask-${i}`} className="relative flex items-center py-[7px] rounded-lg">
            <div
              className="absolute right-0 top-0 bottom-0 bg-fall/[0.06] rounded-lg"
              style={{ width: `${(ask.total / maxTotal) * 100}%` }}
            />
            <span className="flex-1 text-[14px] tabular-nums text-fall font-medium relative z-10">
              {formatPrice(ask.price)}
            </span>
            <span className="flex-1 text-[14px] tabular-nums text-text-secondary text-right relative z-10">
              {formatQuantity(ask.quantity)}
            </span>
          </div>
        ))}
      </div>

      {/* 스프레드 / Spread */}
      <div className="py-3.5 text-center">
        <span className="text-[12px] text-text-quaternary font-medium">
          {t('orderbook.spread')}{' '}
          <span className="text-text-secondary font-semibold">
            {formatPrice(orderBook.spread ?? 0)}
          </span>
        </span>
      </div>

      {/* 매수 호가 / Bids (buy orders) */}
      <div className="space-y-px py-1">
        {orderBook.bids.slice(0, 8).map((bid, i) => (
          <div key={`bid-${i}`} className="relative flex items-center py-[7px] rounded-lg">
            <div
              className="absolute right-0 top-0 bottom-0 bg-rise/[0.06] rounded-lg"
              style={{ width: `${(bid.total / maxTotal) * 100}%` }}
            />
            <span className="flex-1 text-[14px] tabular-nums text-rise font-medium relative z-10">
              {formatPrice(bid.price)}
            </span>
            <span className="flex-1 text-[14px] tabular-nums text-text-secondary text-right relative z-10">
              {formatQuantity(bid.quantity)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
