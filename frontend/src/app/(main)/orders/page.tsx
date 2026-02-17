'use client';

import { useState } from 'react';
import AuthGuard from '@/components/layout/AuthGuard';
import TransactionList from '@/components/portfolio/TransactionList';
import Tabs from '@/components/ui/Tabs';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import { useOrders, useCancelOrder } from '@/hooks/useOrders';
import { cn, formatPrice, formatQuantity, formatDate } from '@/lib/format';

const statusTabs = [
  { key: 'all', label: '전체' },
  { key: 'PENDING', label: '대기중' },
  { key: 'FILLED', label: '체결완료' },
];

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: orders, isLoading } = useOrders(
    statusFilter === 'all' ? undefined : statusFilter,
  );
  const cancelOrder = useCancelOrder();

  return (
    <AuthGuard>
      <div>
        <div className="px-5 py-4">
          <h1 className="text-xl font-bold text-text-primary">주문 내역</h1>
        </div>

        <div className="px-5">
          <Tabs
            tabs={statusTabs}
            activeTab={statusFilter}
            onChange={setStatusFilter}
            variant="pill"
          />
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3 px-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-16" />
              ))}
            </div>
          ) : statusFilter === 'PENDING' ? (
            /* Pending orders with cancel button */
            <div className="divide-y divide-border">
              {orders?.map((order) => (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelOrder.mutate(order.id)}
                      disabled={cancelOrder.isPending}
                    >
                      취소
                    </Button>
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
              {(!orders || orders.length === 0) && (
                <div className="py-16 text-center text-text-secondary text-sm">
                  대기중인 주문이 없습니다
                </div>
              )}
            </div>
          ) : (
            <TransactionList orders={orders ?? []} />
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
