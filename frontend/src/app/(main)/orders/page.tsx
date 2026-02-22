/**
 * @file 주문 내역 페이지
 * @description 현재 사용자의 주문 목록과 체결 내역을 보여주는 페이지
 *
 * @file Orders Page
 * @description Page showing user order list and trade history
 */
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import AuthGuard from '@/components/layout/AuthGuard';
import TransactionList from '@/components/portfolio/TransactionList';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import { useOrders, useCancelOrder } from '@/hooks/useOrders';
import { useTranslation } from '@/hooks/useTranslation';
import { cn, formatPrice, formatQuantity, formatDate } from '@/lib/format';
import { Search, ChevronDown, ClipboardList, Check } from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';

const STATUS_OPTIONS: { key: string; labelKey: TranslationKey }[] = [
  { key: 'all', labelKey: 'orders.all' },
  { key: 'PENDING', labelKey: 'orders.pending' },
  { key: 'FILLED', labelKey: 'orders.filled' },
];

function StatusDropdown({
  value,
  onChange,
  options,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  options: typeof STATUS_OPTIONS;
  t: (key: TranslationKey) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedLabel = options.find((o) => o.key === value);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 bg-bg-secondary border border-border rounded-xl pl-3 pr-2 sm:pl-4 sm:pr-3 py-2.5',
          'text-[13px] sm:text-[14px] font-medium transition-colors',
          open && 'border-accent/60',
          value !== 'all' ? 'text-text-primary' : 'text-text-tertiary',
        )}
      >
        <span className="whitespace-nowrap">{selectedLabel ? t(selectedLabel.labelKey) : ''}</span>
        <ChevronDown className={cn('w-4 h-4 text-text-quaternary transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[140px] bg-bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={cn(
                'flex items-center justify-between w-full px-3.5 py-2.5 text-left text-[13px] sm:text-[14px] font-medium transition-colors',
                opt.key === value
                  ? 'text-accent bg-accent/10'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
              )}
            >
              {t(opt.labelKey)}
              {opt.key === value && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
        <div className="py-6 flex items-center gap-2.5">
          <ClipboardList className="w-5 h-5 text-accent" />
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
          {/* Status filter – custom dropdown */}
          <StatusDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            t={t}
          />
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
