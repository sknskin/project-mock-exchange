'use client';

import { cn, formatPrice, formatQuantity } from '@/lib/format';
import type { OrderBook as OrderBookType } from '@/types';

interface OrderBookProps {
  orderBook: OrderBookType;
}

export default function OrderBook({ orderBook }: OrderBookProps) {
  const maxTotal = Math.max(
    ...orderBook.asks.map((a) => a.total),
    ...orderBook.bids.map((b) => b.total),
  );

  return (
    <div className="px-6">
      <div className="flex text-[12px] text-text-quaternary py-2 font-medium">
        <span className="flex-1">가격</span>
        <span className="flex-1 text-right">수량</span>
      </div>

      {/* Asks (sell orders) */}
      <div className="space-y-px py-1">
        {[...orderBook.asks].reverse().slice(0, 8).map((ask, i) => (
          <div key={`ask-${i}`} className="relative flex items-center py-[6px] rounded">
            <div
              className="absolute right-0 top-0 bottom-0 bg-fall/[0.08] rounded"
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

      {/* Spread */}
      <div className="py-3 text-center">
        <span className="text-[12px] text-text-quaternary font-medium">
          스프레드{' '}
          <span className="text-text-secondary font-semibold">
            {formatPrice(orderBook.spread ?? 0)}
          </span>
        </span>
      </div>

      {/* Bids (buy orders) */}
      <div className="space-y-px py-1">
        {orderBook.bids.slice(0, 8).map((bid, i) => (
          <div key={`bid-${i}`} className="relative flex items-center py-[6px] rounded">
            <div
              className="absolute right-0 top-0 bottom-0 bg-rise/[0.08] rounded"
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
