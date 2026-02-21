/**
 * @file 주문 내역 페이지
 * @description 현재 사용자의 주문 목록과 체결 내역을 보여주는 페이지
 *
 * @file Orders Page
 * @description Page showing user order list and trade history
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import AuthGuard from '@/components/layout/AuthGuard';
import TransactionList from '@/components/portfolio/TransactionList';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import { useOrders, useCancelOrder } from '@/hooks/useOrders';
import { useTranslation } from '@/hooks/useTranslation';
import { cn, formatPrice, formatQuantity, formatDate } from '@/lib/format';
import { Search, ChevronDown } from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';

const STATUS_OPTIONS: { key: string; labelKey: TranslationKey }[] = [
  { key: 'all', labelKey: 'orders.all' },
  { key: 'PENDING', labelKey: 'orders.pending' },
  { key: 'FILLED', labelKey: 'orders.filled' },
];

export default function OrdersPage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [symbolSearch, setSymbolSearch] = useState('');
  const { data: orders, isLoading } = useOrders(
    statusFilter === 'all' ? undefined : statusFilter,
  );
  const cancelOrder = useCancelOrder();

  // Debounce symbol search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSymbolSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Client-side symbol filter
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!symbolSearch.trim()) return orders;
    const q = symbolSearch.toLowerCase();
    return orders.filter((o) => o.symbol.toLowerCase().includes(q));
  }, [orders, symbolSearch]);

  return (
    <AuthGuard>
      <div>
        <div className="py-6">
          <h1 className="text-[20px] font-extrabold text-text-primary">{t('orders.title')}</h1>
        </div>

        {/* Search + Status filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('orders.searchSymbol')}
              className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
            />
          </div>
          {/* Status filter select */}
          <div className="relative shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={cn(
                'appearance-none bg-bg-secondary border border-border rounded-xl pl-4 pr-9 py-2.5',
                'text-[14px] font-medium transition-colors cursor-pointer',
                'focus:outline-none focus:border-accent/60',
                statusFilter !== 'all' ? 'text-text-primary' : 'text-text-tertiary',
              )}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary pointer-events-none" />
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-16 rounded-xl" />
              ))}
            </div>
          ) : statusFilter === 'PENDING' ? (
            <div className="divide-y divide-border/40">
              {filteredOrders?.map((order) => (
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
                        {order.side === 'BUY' ? t('orders.buy') : t('orders.sell')}
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
                      {t('orders.cancel')}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[12px] text-text-quaternary">
                      {formatQuantity(order.quantity)}{t('orders.unit')} ·{' '}
                      {order.price ? formatPrice(order.price) : t('orders.marketPrice')}
                    </span>
                    <span className="text-[12px] text-text-quaternary">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
              {(!filteredOrders || filteredOrders.length === 0) && (
                <div className="py-24 text-center text-text-quaternary text-[14px]">
                  {t('orders.noPending')}
                </div>
              )}
            </div>
          ) : (
            <TransactionList orders={filteredOrders ?? []} />
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
