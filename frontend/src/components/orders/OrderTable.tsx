/**
 * @file 주문 테이블 컴포넌트
 * @description 주문 목록을 상태별로 렌더링하며, PENDING 주문은 수정/취소 기능 제공
 *
 * @file Order Table Component
 * @description Renders order list by status, with modify/cancel actions for PENDING orders
 */
'use client';

import Link from 'next/link';
import TransactionList from '@/components/portfolio/TransactionList';
import Skeleton from '@/components/ui/Skeleton';
import ServiceError from '@/components/ui/ServiceError';
import Pagination from '@/components/ui/Pagination';
import OrderEditModal from './OrderEditModal';
import { cn, formatQuantity, formatDate, formatPriceDisplay } from '@/lib/format';
import { ClipboardList, LayoutDashboard, Activity } from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';
import type { Order } from '@/types';

interface OrderTableProps {
  orders: Order[] | undefined;
  filteredOrders: Order[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  statusFilter: string;
  // 인라인 수정 상태 / Inline edit state
  editingOrderId: string | null;
  editPrice: string;
  editQuantity: string;
  onStartEditing: (order: Order) => void;
  onEditPriceChange: (v: string) => void;
  onEditQuantityChange: (v: string) => void;
  onModify: (orderId: string) => void;
  onCancelEdit: () => void;
  onCancelOrder: (orderId: string) => void;
  isModifying: boolean;
  isCancelling: boolean;
  // 통화 / Currency
  currencyMode: 'krw' | 'original';
  rate?: number;
  // 페이지네이션 / Pagination
  orderPage: number;
  ordersPerPage: number;
  onPageChange: (page: number) => void;
  t: (key: TranslationKey) => string;
}

/**
 * 주문 테이블 — 상태별 렌더링 + PENDING 주문 수정/취소
 * Order table — renders by status + modify/cancel for PENDING orders
 */
export default function OrderTable({
  orders,
  filteredOrders,
  isLoading,
  error,
  refetch,
  statusFilter,
  editingOrderId,
  editPrice,
  editQuantity,
  onStartEditing,
  onEditPriceChange,
  onEditQuantityChange,
  onModify,
  onCancelEdit,
  onCancelOrder,
  isModifying,
  isCancelling,
  currencyMode,
  rate,
  orderPage,
  ordersPerPage,
  onPageChange,
  t,
}: OrderTableProps) {
  return (
    <>
      {/* 주문 요약 통계 / Order Summary Stats */}
      {!isLoading && orders && orders.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-5">
          {[
            { label: t('orders.totalOrders'), value: orders.length, color: 'text-text-primary' },
            { label: t('orders.filledOrders'), value: orders.filter((o) => o.status === 'FILLED').length, color: 'text-success' },
            { label: t('orders.pendingOrders'), value: orders.filter((o) => o.status === 'PENDING').length, color: 'text-warning' },
          ].map((stat) => (
            <div key={stat.label} className="bg-bg-secondary/60 border border-border/60 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-center">
              <div className={cn('text-[17px] md:text-[20px] font-extrabold tabular-nums', stat.color)}>{stat.value}</div>
              <div className="text-[10px] md:text-[11px] text-text-quaternary font-medium mt-0.5 truncate">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      <div>
        {error ? (
          <ServiceError onRetry={refetch} />
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-16 rounded-xl" />
            ))}
          </div>
        ) : statusFilter === 'PENDING' ? (
          <div className="divide-y divide-border/40">
            {filteredOrders?.map((order) => (
              <div key={order.id} className="py-3.5">
                {editingOrderId === order.id ? (
                  <OrderEditModal
                    order={order}
                    editPrice={editPrice}
                    editQuantity={editQuantity}
                    onEditPriceChange={onEditPriceChange}
                    onEditQuantityChange={onEditQuantityChange}
                    onConfirm={onModify}
                    onCancel={onCancelEdit}
                    isModifying={isModifying}
                    t={t}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
                        <span
                          className={cn(
                            'text-[11px] md:text-[12px] font-bold px-2 py-1 rounded-lg shrink-0',
                            order.side === 'BUY'
                              ? 'bg-rise/12 text-rise'
                              : 'bg-fall/12 text-fall',
                          )}
                        >
                          {order.side === 'BUY' ? t('orders.buy') : t('orders.sell')}
                        </span>
                        {order.triggerType && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-warning/12 text-warning shrink-0">
                            {order.triggerType === 'STOP_LOSS' ? t('order.stopLoss') : t('order.takeProfit')}
                            {' '}@ {formatPriceDisplay(order.triggerPrice!, order.symbol, currencyMode, rate)}
                          </span>
                        )}
                        <span className="text-[13px] md:text-[14px] font-semibold text-text-primary truncate">
                          {order.symbol}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onStartEditing(order)}
                          className="px-2.5 py-1.5 min-h-[36px] sm:min-h-0 sm:py-1 text-[11px] md:text-[11px] font-medium text-text-tertiary border border-border rounded-md hover:text-accent hover:border-accent/50 transition-colors whitespace-nowrap"
                        >
                          {t('orders.modify')}
                        </button>
                        <button
                          onClick={() => onCancelOrder(order.id)}
                          disabled={isCancelling}
                          className="px-2.5 py-1.5 min-h-[36px] sm:min-h-0 sm:py-1 text-[11px] md:text-[11px] font-medium text-fall border border-fall/30 rounded-md hover:bg-fall/10 transition-colors whitespace-nowrap"
                        >
                          {t('orders.cancel')}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <span className="text-[11px] md:text-[12px] text-text-quaternary truncate">
                        {formatQuantity(order.quantity)}{t('orders.unit')} ·{' '}
                        {order.price ? formatPriceDisplay(order.price, order.symbol, currencyMode, rate) : t('orders.marketPrice')}
                      </span>
                      {/* MOB-L-04: 날짜 텍스트 크기 증가 — 모바일 가독성 개선 / Increase date text size — improve mobile readability */}
                      <span className="text-[12px] md:text-[12px] text-text-quaternary shrink-0">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
            {(!filteredOrders || filteredOrders.length === 0) && (
              <div className="py-24 flex flex-col items-center text-center">
                <ClipboardList className="w-10 h-10 text-text-quaternary/40 mb-3" />
                <p className="text-text-quaternary text-[14px] whitespace-pre-line">
                  {t('orders.emptyPending')}
                </p>
                <Link
                  href="/dashboard"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-accent bg-accent/10 rounded-lg hover:bg-accent/20 transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  {t('orders.goToDashboard')}
                </Link>
              </div>
            )}
          </div>
        ) : filteredOrders && filteredOrders.length === 0 ? (
          <div className="py-24 flex flex-col items-center text-center">
            <ClipboardList className="w-10 h-10 text-text-quaternary/40 mb-3" />
            <p className="text-text-quaternary text-[14px] whitespace-pre-line">
              {t('orders.emptyAll')}
            </p>
            {/* UX-L-02: 주문 내역 빈 상태 CTA — 거래 페이지로 이동 / Order history empty state CTA — navigate to trading page */}
            <Link
              href="/dashboard"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              {t('orders.startTrading')}
            </Link>
          </div>
        ) : (
          <TransactionList orders={filteredOrders ?? []} />
        )}
      </div>

      {/* API-M-01: 서버 측 페이지네이션 — 정확한 total이 없으므로 현재 결과 수로 추정
         Server-side pagination — no exact total from API, estimate from current result count */}
      {orders && (orderPage > 1 || orders.length === ordersPerPage) && (
        <Pagination
          page={orderPage}
          totalPages={orders.length === ordersPerPage ? orderPage + 1 : orderPage}
          total={(orderPage - 1) * ordersPerPage + orders.length}
          limit={ordersPerPage}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
