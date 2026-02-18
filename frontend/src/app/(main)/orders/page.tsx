/**
 * @file 주문 내역 페이지
 * @description 현재 사용자의 주문 목록과 체결 내역을 보여주는 페이지
 *
 * @file Orders Page
 * @description Page showing user order list and trade history
 */
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
        <div className="py-6">
          <h1 className="text-[20px] font-extrabold text-text-primary">주문 내역</h1>
        </div>

        <div>
          <Tabs
            tabs={statusTabs}
            activeTab={statusFilter}
            onChange={setStatusFilter}
            variant="pill"
          />
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-16 rounded-xl" />
              ))}
            </div>
          ) : statusFilter === 'PENDING' ? (
            <div className="divide-y divide-border/40">
              {orders?.map((order) => (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelOrder.mutate(order.id)}
                      disabled={cancelOrder.isPending}
                    >
                      취소
                    </Button>
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
              {(!orders || orders.length === 0) && (
                <div className="py-24 text-center text-text-quaternary text-[14px]">
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
