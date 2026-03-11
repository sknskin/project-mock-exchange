/**
 * @file 주문 내역 페이지
 * @description 현재 사용자의 주문 목록과 체결 내역을 보여주는 페이지
 *
 * @file Orders Page
 * @description Page showing user order list and trade history
 */
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { cn, formatQuantity, formatDate, formatPriceDisplay, formatCurrencyDisplay } from '@/lib/format';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { Search, ChevronDown, ClipboardList, Check, BarChart, LayoutDashboard, Activity, Download, RefreshCw } from 'lucide-react';
import { exportToCSV } from '@/lib/export';
import type { TranslationKey } from '@/lib/i18n';
import type { Order } from '@/types';

// 주문 상태 필터 옵션 — 서버 API의 status 파라미터 값과 일치 / Order status filter options — match server API status param values
const STATUS_OPTIONS: { key: string; labelKey: TranslationKey }[] = [
  { key: 'all', labelKey: 'orders.all' },
  { key: 'PENDING', labelKey: 'orders.pending' },
  { key: 'FILLED', labelKey: 'orders.filled' },
  { key: 'CANCELLED', labelKey: 'orders.cancelled' },
];

/**
 * 커스텀 드롭다운 — 네이티브 select 대신 디자인 일관성을 위해 사용
 * Custom dropdown — replaces native select for design consistency
 */
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

  // 외부 클릭 시 드롭다운 닫기 / Close dropdown on outside click
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

/* ─── 분석 탭 컴포넌트 / Analysis Tab Component ─── */
interface AnalysisTabProps {
  trades: TradeHistory[];
  userId: string;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  t: (key: TranslationKey) => string;
  currencyMode: 'krw' | 'original';
  rate?: number;
}

function AnalysisTab({ trades, userId, isLoading, error, refetch, t, currencyMode, rate }: AnalysisTabProps) {
  // 통화 모드에 따라 가격을 포맷하는 헬퍼 / Helper to format price based on currency mode
  const fmt = (v: number, symbol: string) => formatPriceDisplay(v, symbol, currencyMode, rate);

  /**
   * 거래 데이터로부터 분석 통계를 계산 (메모이제이션)
   * 포함: 총 거래수, 총 거래량(KRW), 승률, 시간대별 분포, 종목별 내역
   *
   * Compute analysis stats from trade data (memoized):
   * Includes: total trades, total volume (KRW), win rate, hourly distribution, symbol breakdown
   */
  const stats = useMemo(() => {
    if (!trades.length) return null;

    const totalTrades = trades.length;
    // 총거래량을 KRW로 환산 — .KS 접미사가 없으면 USD 종목으로 간주하여 환율 곱하기
    // Convert total volume to KRW — symbols without .KS suffix are treated as USD and multiplied by rate
    const totalVolumeKrw = trades.reduce((sum, tr) => {
      const isUsd = !tr.symbol.endsWith('.KS');
      return sum + (isUsd && rate ? tr.total * rate : tr.total);
    }, 0);

    /**
     * 승률 계산: 종목별로 평균 매수가 vs 평균 매도가를 비교
     * 매도 평균가 > 매수 평균가이면 '승', 그렇지 않으면 '패'
     *
     * Win rate calculation: compare avg buy price vs avg sell price per symbol
     * avgSell > avgBuy = win, otherwise = loss
     */
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
      // 매수/매도 둘 다 있는 종목만 승패 판정 / Only evaluate symbols with both buy and sell trades
      if (s.buyQty > 0 && s.sellQty > 0) {
        const avgBuy = s.buyTotal / s.buyQty;
        const avgSell = s.sellTotal / s.sellQty;
        if (avgSell > avgBuy) wins++;
        else losses++;
      }
    }
    const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

    // 24시간 시간대별 거래 분포 — 바 차트 데이터 / 24-hour trading distribution — bar chart data
    const hourCounts = Array.from({ length: 24 }, () => 0);
    for (const tr of trades) {
      const hour = new Date(tr.executedAt).getHours();
      hourCounts[hour]++;
    }
    const maxHourCount = Math.max(...hourCounts, 1);

    // 종목별 매수/매도 횟수, 총수량, 평균가, 거래대금 집계 / Per-symbol breakdown: buy/sell counts, qty, avg price, volume
    const breakdown = Object.entries(symbolMap).map(([symbol, s]) => ({
      symbol,
      buyCount: trades.filter((tr) => tr.symbol === symbol && tr.buyerId === userId).length,
      sellCount: trades.filter((tr) => tr.symbol === symbol && tr.sellerId === userId).length,
      totalQty: s.buyQty + s.sellQty,
      avgPrice: (s.buyTotal + s.sellTotal) / (s.buyQty + s.sellQty),
      volume: s.buyTotal + s.sellTotal,
    }));

    return { totalTrades, totalVolumeKrw, winRate, wins, losses, hourCounts, maxHourCount, breakdown };
  }, [trades, userId, rate]);

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
          { label: t('orders.analysisTotalVolume'), value: formatCurrencyDisplay(stats.totalVolumeKrw, currencyMode, rate) },
          { label: t('orders.analysisAvgTradeSize'), value: formatCurrencyDisplay(stats.totalVolumeKrw / stats.totalTrades, currencyMode, rate) },
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
        <h3 className="text-[15px] md:text-[16px] font-bold text-text-secondary mb-4">{t('orders.analysisTimeDistribution')}</h3>
        <div className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 md:p-6">
          {/* Vertical bar chart */}
          <div className="flex items-end gap-[3px] md:gap-[6px] h-[180px] md:h-[220px] mb-3">
            {stats.hourCounts.map((count, hour) => {
              const pct = (count / stats.maxHourCount) * 100;
              return (
                <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  {/* Tooltip on hover */}
                  {count > 0 && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center px-2 py-1 bg-bg-primary border border-border rounded-lg shadow-lg z-10 whitespace-nowrap">
                      <span className="text-[11px] md:text-[12px] font-semibold text-text-primary tabular-nums">
                        {String(hour).padStart(2, '0')}{t('orders.analysisTimeHour')} — {count}
                      </span>
                    </div>
                  )}
                  {/* Count label above bar (only show if non-zero) */}
                  {count > 0 && (
                    <span className="text-[10px] md:text-[11px] font-medium text-text-tertiary tabular-nums mb-1 leading-none">
                      {count}
                    </span>
                  )}
                  {/* Bar */}
                  <div
                    className={cn(
                      'w-full rounded-t-sm md:rounded-t transition-all',
                      count > 0 ? 'bg-accent hover:bg-accent/80' : 'bg-bg-tertiary/60',
                    )}
                    style={{ height: count > 0 ? `${Math.max(pct, 4)}%` : '2px' }}
                  />
                </div>
              );
            })}
          </div>
          {/* Hour labels below chart */}
          <div className="flex gap-[3px] md:gap-[6px]">
            {stats.hourCounts.map((_, hour) => (
              <div key={hour} className="flex-1 text-center">
                <span className="text-[9px] md:text-[11px] text-text-quaternary tabular-nums leading-none">
                  {String(hour).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
          {/* Axis legend */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
            <span className="text-[11px] md:text-[12px] text-text-quaternary">{t('orders.analysisTimeHour')}</span>
            <span className="text-[11px] md:text-[12px] text-text-quaternary">{t('orders.analysisTradeCount')}</span>
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
                    <td className="px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] text-text-secondary tabular-nums text-right">{fmt(row.avgPrice, row.symbol)}</td>
                    <td className="px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] text-text-primary font-medium tabular-nums text-right">{fmt(row.volume, row.symbol)}</td>
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
  const { query: { data: rateData } } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const rate = rateData?.rate;

  // 3개 탭 상태: 주문, 체결내역, 분석 / Three-tab state: orders, trades, analysis
  const [tab, setTabRaw] = useState<'orders' | 'trades' | 'analysis'>('orders');
  // 탭 전환 시 상단으로 스크롤 / Scroll to top on tab change
  const setTab = useCallback((v: typeof tab) => { setTabRaw(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  // 주문 탭 필터 상태 / Orders tab filter state
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [symbolSearch, setSymbolSearch] = useState('');
  const user = useAuthStore((s) => s.user);

  // 데이터 조회 — 체결내역은 모든 탭에서 공유 (분석 탭에서도 사용) / Data fetching — trades shared across tabs (used by analysis tab too)
  const { data: trades, isLoading: tradesLoading, error: tradesError, refetch: refetchTrades } = useTradeHistory();
  // statusFilter가 'all'이면 undefined 전달하여 전체 조회 / Pass undefined for 'all' to fetch all orders
  const { data: orders, isLoading, error: ordersError, refetch: refetchOrders } = useOrders(
    statusFilter === 'all' ? undefined : statusFilter,
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refetchOrders(), refetchTrades(), new Promise((r) => setTimeout(r, 1000))]);
    setIsRefreshing(false);
  }, [refetchOrders, refetchTrades]);

  // 주문 취소/수정 뮤테이션 / Order cancel/modify mutations
  const cancelOrder = useCancelOrder();
  const modifyOrder = useModifyOrder();

  // 인라인 수정 모드 상태 — editingOrderId가 설정되면 해당 주문이 수정 폼으로 전환
  // Inline edit mode state — when editingOrderId is set, that order row becomes an edit form
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  // 체결내역 탭 필터 상태 / Trade history tab filter state
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
      useToastStore.getState().addToast(t('orders.modifySuccess'), 'success');
    } catch {
      // handled by query client
    }
  };

  // 심볼 검색 디바운스 — 300ms 지연으로 불필요한 필터링 방지 / Debounce symbol search — 300ms delay to prevent unnecessary filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setSymbolSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 클라이언트 측 심볼 필터 — 서버에서 전체 조회 후 프론트에서 필터 / Client-side symbol filter — filter locally after full server fetch
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!symbolSearch.trim()) return orders;
    const q = symbolSearch.toLowerCase();
    return orders.filter((o) => o.symbol.toLowerCase().includes(q));
  }, [orders, symbolSearch]);

  /**
   * 체결내역 클라이언트 측 필터 (매수/매도 + 심볼 검색)
   * buyerId === 현재 유저 ID이면 매수, 아니면 매도로 판정
   *
   * Trade history client-side filter (side + symbol)
   * buyerId === current user ID means BUY side, otherwise SELL
   */
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
        <div className="py-6 flex items-center justify-between h-[88px]">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-5 h-5 text-accent" />
            <h1 className="text-[20px] font-extrabold text-text-primary">{t('orders.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[11px] text-text-quaternary">
              {t('orders.autoRefresh')}
            </span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                'flex items-center justify-center gap-2 h-10 min-w-[120px] px-4 rounded-xl text-[13px] font-semibold transition-all duration-150 border btn-outline',
                isRefreshing
                  ? 'border-border text-text-quaternary cursor-not-allowed'
                  : 'border-accent/30 text-accent hover:bg-accent/10',
              )}
            >
              <RefreshCw className={cn('w-4 h-4 shrink-0', isRefreshing && 'animate-spin')} />
              {t('orders.refresh')}
            </button>
          </div>
        </div>

        <div className="flex border-b border-border mb-2">
          {([
            { key: 'orders' as const, label: t('orders.title') },
            { key: 'trades' as const, label: t('orders.tradeHistory') },
            { key: 'analysis' as const, label: t('orders.analysis') },
          ]).map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                'relative px-4 py-2.5 text-[13px] sm:text-[14px] font-semibold transition-colors',
                tab === item.key
                  ? 'text-accent'
                  : 'text-text-tertiary hover:text-text-primary',
              )}
            >
              {item.label}
              {tab === item.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-t" />
              )}
            </button>
          ))}
        </div>

        <ExchangeRateBar />
        <div className="mb-5" />

        {tab === 'orders' && (
          <>
            {/* 검색 + 상태 필터 바 / Search + Status filter bar */}
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
                                  {' '}@ {formatPriceDisplay(order.triggerPrice!, order.symbol, currencyMode, rate)}
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
                              {order.price ? formatPriceDisplay(order.price, order.symbol, currencyMode, rate) : t('orders.marketPrice')}
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
            {/* 체결내역 필터 바 — 심볼 검색 + 매수/매도 세그먼트 / Trade history filter bar — symbol search + buy/sell segment */}
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

            {/* CSV 내보내기 버튼 / CSV export button */}
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
                          {formatPriceDisplay(trade.price, trade.symbol, currencyMode, rate)} × {trade.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                        </div>
                        <div className="text-[11px] md:text-[12px] text-text-tertiary tabular-nums truncate">
                          {t('orders.totalAmount')}: {formatPriceDisplay(trade.total, trade.symbol, currencyMode, rate)}
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
          <AnalysisTab trades={trades ?? []} userId={user?.id ?? ''} isLoading={tradesLoading} error={tradesError} refetch={refetchTrades} t={t} currencyMode={currencyMode} rate={rate} />
        )}
      </div>

      {/* 주문 취소 확인 모달 / Order cancel confirmation modal */}
      <ConfirmModal
        isOpen={cancelTargetId !== null}
        onClose={() => setCancelTargetId(null)}
        onConfirm={() => {
          if (cancelTargetId) {
            cancelOrder.mutate(cancelTargetId, {
              onSuccess: () => useToastStore.getState().addToast(t('orders.cancelSuccess'), 'success'),
            });
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
