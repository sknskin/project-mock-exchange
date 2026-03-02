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
import ServiceError from '@/components/ui/ServiceError';
import { useOrders, useCancelOrder, useModifyOrder, useTradeHistory, type TradeHistory } from '@/hooks/useOrders';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import { cn, formatPrice, formatQuantity, formatDate, formatCurrencyDisplay } from '@/lib/format';
import { useAuthStore } from '@/stores/auth';
import { Search, ChevronDown, ClipboardList, Check, BarChart, LayoutDashboard, TrendingUp, Activity, Download } from 'lucide-react';
import { exportToCSV } from '@/lib/export';
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

/* ─── Analysis Tab ─── */
interface AnalysisTabProps {
  trades: TradeHistory[];
  userId: string;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  t: (key: TranslationKey) => string;
  fmt: (v: number) => string;
}

function AnalysisTab({ trades, userId, isLoading, error, refetch, t, fmt }: AnalysisTabProps) {
  const stats = useMemo(() => {
    if (!trades.length) return null;

    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum, tr) => sum + tr.total, 0);
    const avgTradeSize = totalVolume / totalTrades;

    // Win rate: per-symbol, compare user's avg sell price vs avg buy price
    const symbolMap: Record<string, { buyTotal: number; buyQty: number; sellTotal: number; sellQty: number }> = {};
    for (const tr of trades) {
      if (!symbolMap[tr.symbol]) symbolMap[tr.symbol] = { buyTotal: 0, buyQty: 0, sellTotal: 0, sellQty: 0 };
      const isBuyer = tr.buyerId === userId;
      if (isBuyer) {
        symbolMap[tr.symbol].buyTotal += tr.price * tr.quantity;
        symbolMap[tr.symbol].buyQty += tr.quantity;
      } else {
        symbolMap[tr.symbol].sellTotal += tr.price * tr.quantity;
        symbolMap[tr.symbol].sellQty += tr.quantity;
      }
    }

    let wins = 0;
    let losses = 0;
    for (const sym of Object.keys(symbolMap)) {
      const s = symbolMap[sym];
      if (s.buyQty > 0 && s.sellQty > 0) {
        const avgBuy = s.buyTotal / s.buyQty;
        const avgSell = s.sellTotal / s.sellQty;
        if (avgSell > avgBuy) wins++;
        else losses++;
      }
    }
    const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

    // Time distribution (24h)
    const hourCounts = Array.from({ length: 24 }, () => 0);
    for (const tr of trades) {
      const hour = new Date(tr.executedAt).getHours();
      hourCounts[hour]++;
    }
    const maxHourCount = Math.max(...hourCounts, 1);

    // Symbol breakdown
    const breakdown = Object.entries(symbolMap).map(([symbol, s]) => ({
      symbol,
      buyCount: trades.filter((tr) => tr.symbol === symbol && tr.buyerId === userId).length,
      sellCount: trades.filter((tr) => tr.symbol === symbol && tr.sellerId === userId).length,
      totalQty: s.buyQty + s.sellQty,
      avgPrice: (s.buyTotal + s.sellTotal) / (s.buyQty + s.sellQty),
      volume: s.buyTotal + s.sellTotal,
    }));

    return { totalTrades, totalVolume, avgTradeSize, winRate, wins, losses, hourCounts, maxHourCount, breakdown };
  }, [trades, userId]);

  /* Loading */
  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  /* Error */
  if (error) {
    return <ServiceError onRetry={refetch} />;
  }

  /* Empty */
  if (!trades.length || !stats) {
    return (
      <div className="py-24 flex flex-col items-center text-center">
        <Activity className="w-10 h-10 text-text-quaternary/40 mb-3" />
        <p className="text-text-quaternary text-[14px] whitespace-pre-line">
          {t('orders.analysisEmptyState')}
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-accent bg-accent/10 rounded-lg hover:bg-accent/20 transition-colors"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          {t('orders.goToDashboard')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[
          { label: t('orders.analysisTotalTrades'), value: stats.totalTrades.toLocaleString(), sub: t('orders.analysisTrades') },
          { label: t('orders.analysisTotalVolume'), value: fmt(stats.totalVolume) },
          { label: t('orders.analysisAvgTradeSize'), value: fmt(stats.avgTradeSize) },
          {
            label: t('orders.analysisWinRate'),
            value: `${stats.winRate.toFixed(1)}%`,
            sub: `${t('orders.analysisWins')}: ${stats.wins} / ${t('orders.analysisLosses')}: ${stats.losses}`,
          },
        ].map((card) => (
          <div key={card.label} className="bg-bg-secondary/60 border border-border/60 rounded-xl px-3 md:px-4 py-3 md:py-4">
            <div className="text-[10px] md:text-[11px] text-text-quaternary font-medium mb-1 truncate">{card.label}</div>
            <div className="text-[16px] md:text-[18px] font-extrabold text-text-primary tabular-nums truncate">{card.value}</div>
            {card.sub && <div className="text-[10px] text-text-quaternary mt-0.5 truncate">{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* Time distribution chart */}
      <div>
        <h3 className="text-[14px] font-bold text-text-secondary mb-3">{t('orders.analysisTimeDistribution')}</h3>
        <div className="bg-bg-secondary/60 border border-border/60 rounded-xl p-3 md:p-4 space-y-1.5">
          {stats.hourCounts.map((count, hour) => (
            <div key={hour} className="flex items-center gap-2">
              <span className="w-8 text-[11px] text-text-quaternary tabular-nums text-right shrink-0">
                {String(hour).padStart(2, '0')}{t('orders.analysisTimeHour')}
              </span>
              <div className="flex-1 h-5 bg-bg-tertiary rounded overflow-hidden">
                <div
                  className="h-full bg-accent rounded transition-all"
                  style={{ width: `${(count / stats.maxHourCount) * 100}%` }}
                />
              </div>
              <span className="w-6 text-[11px] text-text-tertiary tabular-nums text-right shrink-0">
                {count}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-text-quaternary">{t('orders.analysisTimeHour')}</span>
            <span className="text-[10px] text-text-quaternary">{t('orders.analysisTradeCount')}</span>
          </div>
        </div>
      </div>

      {/* Symbol breakdown table */}
      <div>
        <h3 className="text-[14px] font-bold text-text-secondary mb-3">{t('orders.analysisSymbolBreakdown')}</h3>
        <div className="bg-bg-secondary/60 border border-border/60 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-3 md:px-4 py-2.5 text-[11px] md:text-[12px] font-semibold text-text-quaternary">{t('orders.analysisSymbol')}</th>
                  <th className="px-3 md:px-4 py-2.5 text-[11px] md:text-[12px] font-semibold text-text-quaternary text-right">{t('orders.analysisBuyCount')}</th>
                  <th className="px-3 md:px-4 py-2.5 text-[11px] md:text-[12px] font-semibold text-text-quaternary text-right">{t('orders.analysisSellCount')}</th>
                  <th className="px-3 md:px-4 py-2.5 text-[11px] md:text-[12px] font-semibold text-text-quaternary text-right">{t('orders.analysisTotalQty')}</th>
                  <th className="px-3 md:px-4 py-2.5 text-[11px] md:text-[12px] font-semibold text-text-quaternary text-right">{t('orders.analysisAvgPrice')}</th>
                  <th className="px-3 md:px-4 py-2.5 text-[11px] md:text-[12px] font-semibold text-text-quaternary text-right">{t('orders.analysisVolume')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {stats.breakdown.map((row) => (
                  <tr key={row.symbol} className="hover:bg-bg-tertiary/40 transition-colors">
                    <td className="px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] font-semibold text-text-primary">{row.symbol}</td>
                    <td className="px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] text-rise tabular-nums text-right">{row.buyCount}</td>
                    <td className="px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] text-fall tabular-nums text-right">{row.sellCount}</td>
                    <td className="px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] text-text-secondary tabular-nums text-right">{row.totalQty.toLocaleString(undefined, { maximumFractionDigits: 8 })}</td>
                    <td className="px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] text-text-secondary tabular-nums text-right">{fmt(row.avgPrice)}</td>
                    <td className="px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] text-text-primary font-medium tabular-nums text-right">{fmt(row.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const { data: rateData } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const rate = rateData?.rate;
  const fmt = (v: number) => formatCurrencyDisplay(v, currencyMode, rate);
  const [tab, setTab] = useState<'orders' | 'trades' | 'analysis'>('orders');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [symbolSearch, setSymbolSearch] = useState('');
  const user = useAuthStore((s) => s.user);
  const { data: trades, isLoading: tradesLoading, error: tradesError, refetch: refetchTrades } = useTradeHistory();
  const { data: orders, isLoading, error: ordersError, refetch: refetchOrders } = useOrders(
    statusFilter === 'all' ? undefined : statusFilter,
  );
  const cancelOrder = useCancelOrder();
  const modifyOrder = useModifyOrder();
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [tradeSideFilter, setTradeSideFilter] = useState<'all' | 'BUY' | 'SELL'>('all');
  const [tradeSearch, setTradeSearch] = useState('');

  const startEditing = (order: Order) => {
    setEditingOrderId(order.id);
    setEditPrice(order.price?.toString() || '');
    setEditQuantity(order.quantity?.toString() || '');
  };

  const handleModify = async (orderId: string) => {
    if (modifyOrder.isPending) return;
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

  // Trade history client-side filter (side + symbol)
  const filteredTrades = useMemo(() => {
    if (!trades) return [];
    return trades.filter((trade) => {
      if (tradeSideFilter !== 'all') {
        const isBuyer = trade.buyerId === user?.id;
        if (tradeSideFilter === 'BUY' && !isBuyer) return false;
        if (tradeSideFilter === 'SELL' && isBuyer) return false;
      }
      if (tradeSearch.trim()) {
        const q = tradeSearch.toLowerCase();
        if (!trade.symbol.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [trades, tradeSideFilter, tradeSearch, user?.id]);

  return (
    <AuthGuard>
      <div>
        <div className="py-4 md:py-6 flex items-center gap-2.5">
          <ClipboardList className="w-5 h-5 text-accent" />
          <h1 className="text-[18px] md:text-[20px] font-extrabold text-text-primary">{t('orders.title')}</h1>
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
          <button
            onClick={() => setTab('analysis')}
            className={cn(
              'px-4 py-2 text-[13px] font-semibold rounded-lg transition-colors',
              tab === 'analysis'
                ? 'bg-accent text-white'
                : 'bg-bg-secondary text-text-tertiary hover:text-text-primary',
            )}
          >
            {t('orders.analysis')}
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
              {ordersError ? (
                <ServiceError onRetry={refetchOrders} />
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
                                  {' '}@ {formatPrice(order.triggerPrice!)}
                                </span>
                              )}
                              <span className="text-[13px] md:text-[14px] font-semibold text-text-primary truncate">
                                {order.symbol}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => startEditing(order)}
                                className="px-2 py-1 text-[10px] md:text-[11px] font-medium text-text-tertiary border border-border rounded-md hover:text-accent hover:border-accent/50 transition-colors whitespace-nowrap"
                              >
                                {t('orders.modify')}
                              </button>
                              <button
                                onClick={() => setCancelTargetId(order.id)}
                                disabled={cancelOrder.isPending}
                                className="px-2 py-1 text-[10px] md:text-[11px] font-medium text-fall border border-fall/30 rounded-md hover:bg-fall/10 transition-colors whitespace-nowrap"
                              >
                                {t('orders.cancel')}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <span className="text-[11px] md:text-[12px] text-text-quaternary truncate">
                              {formatQuantity(order.quantity)}{t('orders.unit')} ·{' '}
                              {order.price ? formatPrice(order.price) : t('orders.marketPrice')}
                            </span>
                            <span className="text-[11px] md:text-[12px] text-text-quaternary shrink-0">
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
                  <Link
                    href="/dashboard"
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-accent bg-accent/10 rounded-lg hover:bg-accent/20 transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    {t('orders.goToDashboard')}
                  </Link>
                </div>
              ) : (
                <TransactionList orders={filteredOrders ?? []} />
              )}
            </div>
          </>
        )}

        {tab === 'trades' && (
          <div>
            {/* Trade history filter bar */}
            <div className="flex gap-2 sm:gap-3 mb-5">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary pointer-events-none" />
                <input
                  type="text"
                  value={tradeSearch}
                  onChange={(e) => setTradeSearch(e.target.value)}
                  placeholder={t('orders.searchSymbol')}
                  className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
                />
              </div>
              <div className="flex shrink-0 bg-bg-secondary border border-border rounded-xl overflow-hidden">
                {(['all', 'BUY', 'SELL'] as const).map((side) => (
                  <button
                    key={side}
                    onClick={() => setTradeSideFilter(side)}
                    className={cn(
                      'px-3 py-2.5 text-[13px] font-medium transition-colors',
                      tradeSideFilter === side
                        ? side === 'BUY' ? 'bg-rise/15 text-rise' : side === 'SELL' ? 'bg-fall/15 text-fall' : 'bg-accent/15 text-accent'
                        : 'text-text-tertiary hover:text-text-primary',
                    )}
                  >
                    {side === 'all' ? t('orders.all') : side === 'BUY' ? t('orders.buy') : t('orders.sell')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end mb-3">
              <button
                onClick={() => {
                  if (!filteredTrades.length) return;
                  exportToCSV(
                    filteredTrades.map((trade) => ({
                      symbol: trade.symbol,
                      side: trade.buyerId === user?.id ? 'BUY' : 'SELL',
                      price: trade.price,
                      quantity: trade.quantity,
                      total: trade.total,
                      executedAt: new Date(trade.executedAt).toLocaleString(),
                    })),
                    `trades-${new Date().toISOString().slice(0, 10)}`,
                    [
                      { key: 'symbol', label: t('orders.analysisSymbol') },
                      { key: 'side', label: t('orders.side') },
                      { key: 'price', label: t('orders.price') },
                      { key: 'quantity', label: t('orders.quantity') },
                      { key: 'total', label: t('orders.totalAmount') },
                      { key: 'executedAt', label: t('orders.executedAt') },
                    ],
                  );
                }}
                disabled={!filteredTrades.length}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-text-tertiary hover:text-text-primary border border-border rounded-lg hover:bg-bg-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <Download className="w-3.5 h-3.5" />
                {t('export.csv')}
              </button>
            </div>

            {tradesError ? (
              <ServiceError onRetry={refetchTrades} />
            ) : tradesLoading ? (
              <div className="space-y-2 pt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="w-full h-16 rounded-xl" />
                ))}
              </div>
            ) : filteredTrades.length > 0 ? (
              <div className="divide-y divide-border/40">
                {filteredTrades.map((trade) => {
                  const isBuyer = trade.buyerId === user?.id;
                  return (
                    <div key={trade.tradeId} className="py-3 flex items-center gap-2 md:gap-3">
                      <div className={cn(
                        'w-9 md:w-10 h-6 rounded text-[10px] md:text-[11px] font-bold flex items-center justify-center shrink-0',
                        isBuyer ? 'bg-rise/12 text-rise' : 'bg-fall/12 text-fall',
                      )}>
                        {isBuyer ? t('orders.buy') : t('orders.sell')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] md:text-[14px] font-semibold text-text-primary truncate">{trade.symbol}</div>
                        <div className="text-[11px] md:text-[12px] text-text-quaternary truncate">
                          {new Date(trade.executedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right shrink-0 min-w-0 max-w-[45%]">
                        <div className="text-[12px] md:text-[13px] font-medium text-text-primary tabular-nums truncate">
                          {fmt(trade.price)} × {trade.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                        </div>
                        <div className="text-[11px] md:text-[12px] text-text-tertiary tabular-nums truncate">
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
                <p className="text-text-quaternary text-[14px] whitespace-pre-line">
                  {t('orders.emptyTrades')}
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
        )}

        {tab === 'analysis' && (
          <AnalysisTab trades={trades ?? []} userId={user?.id ?? ''} isLoading={tradesLoading} error={tradesError} refetch={refetchTrades} t={t} fmt={fmt} />
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
