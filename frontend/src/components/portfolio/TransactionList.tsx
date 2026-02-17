'use client';

import { cn, formatPrice, formatQuantity, formatDate } from '@/lib/format';
import type { Order } from '@/types';

interface TransactionListProps {
  orders: Order[];
}

export default function TransactionList({ orders }: TransactionListProps) {
  if (orders.length === 0) {
    return (
      <div className="py-16 text-center text-text-secondary text-sm">
        거래 내역이 없습니다
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {orders.map((order) => (
        <div key={order.id} className="px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-xs font-medium px-1.5 py-0.5 rounded',
                  order.side === 'BUY'
                    ? 'bg-rise/10 text-rise'
                    : 'bg-fall/10 text-fall',
                )}
              >
                {order.side === 'BUY' ? '매수' : '매도'}
              </span>
              <span className="text-sm font-medium text-text-primary">
                {order.symbol}
              </span>
            </div>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                order.status === 'FILLED' && 'bg-success/10 text-success',
                order.status === 'PENDING' && 'bg-warning/10 text-warning',
                order.status === 'CANCELLED' && 'bg-bg-tertiary text-text-tertiary',
                order.status === 'PARTIALLY_FILLED' && 'bg-accent/10 text-accent',
              )}
            >
              {order.status === 'FILLED'
                ? '체결'
                : order.status === 'PENDING'
                  ? '대기'
                  : order.status === 'CANCELLED'
                    ? '취소'
                    : '부분체결'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-text-secondary">
              {formatQuantity(order.quantity)}개 ·{' '}
              {order.price ? formatPrice(order.price) : '시장가'}
            </span>
            <span className="text-xs text-text-tertiary">
              {formatDate(order.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
