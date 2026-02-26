/**
 * @file 주문 내역 페이지
 * @description 현재 사용자의 주문 목록과 체결 내역을 보여주는 페이지
 *
 * @file Orders Page
 * @description Page showing user order list and trade history
 */
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/layout/AuthGuard';
import TransactionList from '@/components/portfolio/TransactionList';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Skeleton from '@/components/ui/Skeleton';
import { useOrders, useCancelOrder, useModifyOrder, useTradeHistory } from '@/hooks/useOrders';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import { cn, formatPrice, formatQuantity, formatDate, formatCurrencyDisplay } from '@/lib/format';
import { useAuthStore } from '@/stores/auth';
import { Search, ChevronDown, ClipboardList, Check, BarChart, LayoutDashboard } from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';
import type { Order } from '@/types';

const STATUS_OPTIONS: { key: string; labelKey: TranslationKey }[] = [
  { key: 'all', labelKey: 'orders.all' },
  { key: 'PENDING', labelKey: 'orders.pending' },
  { key: 'FILLED', labelKey: 'orders.filled' },
  { key: 'CANCELLED', labelKey: 'orders.cancelled' },
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
  const { data: rateData } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const rate = rateData?.rate;
  const fmt = (v: number) => formatCurrencyDisplay(v, currencyMode, rate);
  const [tab, setTab] = useState<'orders' | 'trades'>('orders');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [symbolSearch, setSymbolSearch] = useState('');
  const user = useAuthStore((s) => s.user);
  const { data: trades, isLoading: tradesLoading } = useTradeHistory();
  const { data: orders, isLoading } = useOrders(
    statusFilter === 'all' ? undefined : statusFilter,
  );
  const cancelOrder = useCancelOrder();
  const modifyOrder = useModifyOrder();
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  const startEditing = (order: Order) => {
    setEditingOrderId(order.id);
    setEditPrice(order.price?.toString() || '');
    setEditQuantity(order.quantity?.toString() || '');
  };

  const handleModify = async (orderId: string) => {
    const price = editPrice ? parseFloat(editPrice) : undefined;
    const quantity = editQuantity ? parseFloat(editQuantity) : undefined;
    if (!price && !quantity) return;
    try {
      await modifyOrder.mutateAsync({ orderId, price, quantity });
      setEditingOrderId(null);
    } catch {
      // handled by query client
    }
  };

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

        <ExchangeRateBar />

        <div className="flex gap-1 mb-4">
          <button
            onClick={() => setTab('orders')}
            className={cn(
              'px-4 py-2 text-[13px] font-semibold rounded-lg transition-colors',
              tab === 'orders'
                ? 'bg-accent text-white'
                : 'bg-bg-secondary text-text-tertiary hover:text-text-primary',
            )}
          >
            {t('orders.title')}
          </button>
          <button
            onClick={() => setTab('trades')}
            className={cn(
              'px-4 py-2 text-[13px] font-semibold rounded-lg transition-colors',
              tab === 'trades'
                ? 'bg-accent text-white'
                : 'bg-bg-secondary text-text-tertiary hover:text-text-primary',
            )}
          >
            {t('orders.tradeHistory')}
          </button>
        </div>

        {tab === 'orders' && (
          <>
            {/* Search + Status filter bar */}
            <div className="flex gap-2 sm:gap-3 mb-5">
              {/* Search input */}
              <div className="relative flex-1 min-w-0">
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

            {/* 주문 요약 통계 / Order Summary Stats */}
            {!isLoading && orders && orders.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {[
                  { label: t('orders.totalOrders'), value: orders.length, color: 'text-text-primary' },
                  { label: t('orders.filledOrders'), value: orders.filter((o) => o.status === 'FILLED').length, color: 'text-success' },
                  { label: t('orders.pendingOrders'), value: orders.filter((o) => o.status === 'PENDING').length, color: 'text-warning' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-bg-secondary/60 border border-border/60 rounded-xl px-4 py-3 text-center">
                    <div className={cn('text-[20px] font-extrabold tabular-nums', stat.color)}>{stat.value}</div>
                    <div className="text-[11px] text-text-quaternary font-medium mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

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
                      {editingOrderId === order.id ? (
                        <div className="py-3 space-y-2">
                          <div className="flex items-center gap-2 text-[13px]">
                            <span className={cn('font-bold', order.side === 'BUY' ? 'text-rise' : 'text-fall')}>
                              {order.side === 'BUY' ? t('orders.buy') : t('orders.sell')}
                            </span>
                            <span className="font-semibold text-text-primary">{order.symbol}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              placeholder={t('orders.price')}
                              className="flex-1 h-11 px-3 text-[13px] bg-bg-secondary border border-border rounded-lg text-text-primary"
                            />
                            <input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              placeholder={t('orders.quantity')}
                              className="flex-1 h-11 px-3 text-[13px] bg-bg-secondary border border-border rounded-lg text-text-primary"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleModify(order.id)}
                              disabled={modifyOrder.isPending}
                              className="flex-1 h-10 text-[12px] font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                            >
                              {t('orders.confirmModify')}
                            </button>
                            <button
                              onClick={() => setEditingOrderId(null)}
                              className="flex-1 h-10 text-[12px] font-semibold text-text-tertiary bg-bg-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
                            >
                              {t('orders.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
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
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => startEditing(order)}
                                className="px-2 py-1 text-[11px] font-medium text-text-tertiary border border-border rounded-md hover:text-accent hover:border-accent/50 transition-colors"
                              >
                                {t('orders.modify')}
                              </button>
                              <button
                                onClick={() => setCancelTargetId(order.id)}
                                disabled={cancelOrder.isPending}
                                className="px-2 py-1 text-[11px] font-medium text-fall border border-fall/30 rounded-md hover:bg-fall/10 transition-colors"
                              >
                                {t('orders.cancel')}
                              </button>
                            </div>
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
              ) : (
                <TransactionList orders={filteredOrders ?? []} />
              )}
            </div>
          </>
        )}

        {tab === 'trades' && (
          <div>
            {tradesLoading ? (
              <div className="space-y-2 pt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="w-full h-16 rounded-xl" />
                ))}
              </div>
            ) : trades && trades.length > 0 ? (
              <div className="divide-y divide-border/40">
                {trades.map((trade) => {
                  const isBuyer = trade.buyerId === user?.id;
                  return (
                    <div key={trade.tradeId} className="py-3 flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-6 rounded text-[11px] font-bold flex items-center justify-center',
                        isBuyer ? 'bg-rise/12 text-rise' : 'bg-fall/12 text-fall',
                      )}>
                        {isBuyer ? t('orders.buy') : t('orders.sell')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-text-primary">{trade.symbol}</div>
                        <div className="text-[12px] text-text-quaternary">
                          {new Date(trade.executedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] font-medium text-text-primary tabular-nums">
                          {fmt(trade.price)} × {trade.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                        </div>
                        <div className="text-[12px] text-text-tertiary tabular-nums">
                          {t('orders.totalAmount')}: {fmt(trade.total)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center text-center">
                <BarChart className="w-10 h-10 text-text-quaternary/40 mb-3" />
                <p className="text-text-quaternary text-[14px]">
                  {t('orders.emptyTrades')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={cancelTargetId !== null}
        onClose={() => setCancelTargetId(null)}
        onConfirm={() => {
          if (cancelTargetId) {
            cancelOrder.mutate(cancelTargetId);
            setCancelTargetId(null);
          }
        }}
        title={t('orders.cancelConfirmTitle')}
        message={t('orders.cancelConfirmMessage')}
        confirmLabel={t('orders.cancel')}
        confirmVariant="danger"
      />
    </AuthGuard>
  );
}
