/**
 * @file 주문 내역 페이지
 * @description 현재 사용자의 주문 목록과 체결 내역을 보여주는 페이지 (오케스트레이터)
 *
 * @file Orders Page
 * @description Page showing user order list and trade history (orchestrator)
 */
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import AuthGuard from '@/components/layout/AuthGuard';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import ConfirmModal from '@/components/ui/ConfirmModal';
import RefreshControl from '@/components/ui/RefreshControl';
import OrderFilters from '@/components/orders/OrderFilters';
import OrderTable from '@/components/orders/OrderTable';
import TradeHistory from '@/components/orders/TradeHistory';
import AnalysisTab from '@/components/orders/AnalysisTab';
import { useOrders, useCancelOrder, useModifyOrder, useTradeHistory } from '@/hooks/useOrders';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { ClipboardList } from 'lucide-react';
import type { Order } from '@/types';

// 페이지당 주문 수 상수 / Orders per page constant
const ORDERS_PER_PAGE = 50;

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

  // API-M-01: 서버 측 페이지네이션 상태 / Server-side pagination state
  const [orderPage, setOrderPage] = useState(1);
  const orderOffset = (orderPage - 1) * ORDERS_PER_PAGE;

  // ORD-M-01: 커스텀 날짜 범위 필터 상태 / Custom date range filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 데이터 조회 — 체결내역은 모든 탭에서 공유 (분석 탭에서도 사용) / Data fetching — trades shared across tabs (used by analysis tab too)
  const { data: trades, isLoading: tradesLoading, error: tradesError, refetch: refetchTrades } = useTradeHistory();
  // statusFilter가 'all'이면 undefined 전달하여 전체 조회 / Pass undefined for 'all' to fetch all orders
  // API-M-01: limit/offset을 서버에 전달하여 서버 측 페이지네이션 / Pass limit/offset to server for server-side pagination
  const { data: orders, isLoading, error: ordersError, refetch: refetchOrders } = useOrders(
    statusFilter === 'all' ? undefined : statusFilter,
    ORDERS_PER_PAGE,
    orderOffset,
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchOrders(), refetchTrades()]);
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

  // 클라이언트 측 심볼 + 날짜 범위 필터 — 서버에서 전체 조회 후 프론트에서 필터
  // Client-side symbol + date range filter — filter locally after full server fetch
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let result = orders;
    if (symbolSearch.trim()) {
      const q = symbolSearch.toLowerCase();
      result = result.filter((o) => o.symbol.toLowerCase().includes(q));
    }
    // ORD-M-01: 커스텀 날짜 범위 필터 적용 / Apply custom date range filter
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((o) => new Date(o.createdAt).getTime() >= from);
    }
    if (dateTo) {
      // 종료일의 끝(23:59:59)까지 포함 / Include until end of the to-date (23:59:59)
      const to = new Date(dateTo).getTime() + 86_400_000 - 1;
      result = result.filter((o) => new Date(o.createdAt).getTime() <= to);
    }
    return result;
  }, [orders, symbolSearch, dateFrom, dateTo]);

  return (
    <AuthGuard>
      <div>
        <div className="py-6 flex items-center justify-between h-[88px]">
          <div className="flex items-center gap-2.5">
            {/* A11Y-L-03: 장식용 아이콘 aria-hidden / Decorative icon aria-hidden */}
            <ClipboardList className="w-5 h-5 text-accent" aria-hidden="true" />
            <h1 className="text-[20px] font-extrabold text-text-primary">{t('orders.title')}</h1>
          </div>
          <RefreshControl intervalSeconds={10} onRefresh={handleRefresh} />
        </div>

        {/* A11Y-M-06: 인라인 탭에 role="tablist"/role="tab" 추가 — 접근성 / Add tablist/tab roles for inline tabs — a11y */}
        <div className="flex border-b border-border mb-2" role="tablist">
          {([
            { key: 'orders' as const, label: t('orders.title') },
            { key: 'trades' as const, label: t('orders.tradeHistory') },
            { key: 'analysis' as const, label: t('orders.analysis') },
          ]).map((item) => (
            <button
              key={item.key}
              role="tab"
              aria-selected={tab === item.key}
              aria-controls={tab === item.key ? 'orders-tabpanel' : undefined}
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

        {/* A11Y-M-06: tabpanel role 추가 — 접근성 / Add tabpanel role — a11y */}
        {tab === 'orders' && (
          <div role="tabpanel" id="orders-tabpanel">
            <OrderFilters
              searchInput={searchInput}
              onSearchChange={setSearchInput}
              statusFilter={statusFilter}
              onStatusChange={(v) => { setStatusFilter(v); setOrderPage(1); }}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              t={t}
            />

            <OrderTable
              orders={orders}
              filteredOrders={filteredOrders}
              isLoading={isLoading}
              error={ordersError}
              refetch={refetchOrders}
              statusFilter={statusFilter}
              editingOrderId={editingOrderId}
              editPrice={editPrice}
              editQuantity={editQuantity}
              onStartEditing={startEditing}
              onEditPriceChange={setEditPrice}
              onEditQuantityChange={setEditQuantity}
              onModify={handleModify}
              onCancelEdit={() => { setEditingOrderId(null); setEditPrice(''); setEditQuantity(''); }}
              onCancelOrder={(id) => setCancelTargetId(id)}
              isModifying={modifyOrder.isPending}
              isCancelling={cancelOrder.isPending}
              currencyMode={currencyMode}
              rate={rate}
              orderPage={orderPage}
              ordersPerPage={ORDERS_PER_PAGE}
              onPageChange={setOrderPage}
              t={t}
            />
          </div>
        )}

        {tab === 'trades' && (
          <div role="tabpanel" id="orders-tabpanel"><TradeHistory
            trades={trades}
            isLoading={tradesLoading}
            error={tradesError}
            refetch={refetchTrades}
            userId={user?.id}
            currencyMode={currencyMode}
            rate={rate}
            t={t}
          /></div>
        )}

        {tab === 'analysis' && (
          <div role="tabpanel" id="orders-tabpanel"><AnalysisTab trades={trades ?? []} userId={user?.id ?? ''} isLoading={tradesLoading} error={tradesError} refetch={refetchTrades} t={t} currencyMode={currencyMode} rate={rate} /></div>
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
