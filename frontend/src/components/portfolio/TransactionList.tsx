/**
 * @file 거래 내역 리스트
 * @description 입출금, 매수/매도 거래 내역을 시간순으로 표시합니다
 *
 * @file Transaction List Component
 * @description Displays deposit/withdrawal and trade transactions chronologically
 */
'use client';

import { cn, formatPrice, formatQuantity, formatDate } from '@/lib/format';
import type { Order } from '@/types';

interface TransactionListProps {
  orders: Order[];
}

export default function TransactionList({ orders }: TransactionListProps) {
  if (orders.length === 0) {
    return (
      <div className="py-24 text-center text-text-quaternary text-[14px]">
        거래 내역이 없습니다
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {orders.map((order) => (
        <div key={order.id} className="py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'text-[12px] font-bold px-2 py-1 rounded-lg',
                  order.side === 'BUY'
                    ? 'bg-rise/12 text-rise'
                    : 'bg-fall/12 text-fall',
                )}
              >
                {order.side === 'BUY' ? '매수' : '매도'}
              </span>
              <span className="text-[14px] font-semibold text-text-primary">
                {order.symbol}
              </span>
            </div>
            <span
              className={cn(
                'text-[12px] font-semibold px-2.5 py-1 rounded-full',
                order.status === 'FILLED' && 'bg-success/10 text-success',
                order.status === 'PENDING' && 'bg-warning/10 text-warning',
                order.status === 'CANCELLED' && 'bg-bg-tertiary text-text-quaternary',
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
          <div className="flex items-center justify-between mt-2">
            <span className="text-[12px] text-text-quaternary">
              {formatQuantity(order.quantity)}개 ·{' '}
              {order.price ? formatPrice(order.price) : '시장가'}
            </span>
            <span className="text-[12px] text-text-quaternary">
              {formatDate(order.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
