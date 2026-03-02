/**
 * @file 종목 상세 페이지
 * @description 개별 종목의 차트, 호가창, 주문 폼을 보여주는 상세 페이지
 *
 * @file Asset Detail Page
 * @description Detail page showing chart, order book, and order form for an asset
 */
'use client';

import { useState, useCallback, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAssetPrice, useCandlesticks, useOrderBook, useRecentTrades } from '@/hooks/useMarket';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTranslation } from '@/hooks/useTranslation';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useAuthStore } from '@/stores/auth';
import CandlestickChart from '@/components/chart/CandlestickChart';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import OrderBookComponent from '@/components/trading/OrderBook';
import OrderSheet from '@/components/trading/OrderSheet';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Tabs from '@/components/ui/Tabs';
import { ChartSkeleton } from '@/components/ui/Skeleton';
import { cn, isKRW, formatPriceDisplay, formatAmountDisplay, formatPercent, formatQuantity, formatTime, formatVolumeDisplay } from '@/lib/format';
import { ArrowLeft, Star, Bell } from 'lucide-react';
import { useWatchlist, useAddWatchlist, useRemoveWatchlist } from '@/hooks/useWatchlist';
import { usePriceAlerts } from '@/hooks/usePriceAlert';
import PriceAlertModal from '@/components/alerts/PriceAlertModal';
import Link from 'next/link';
import type { PriceUpdate } from '@/types';
import type { TranslationKey } from '@/lib/i18n';

const chartIntervalKeys: { key: string; i18nKey: TranslationKey }[] = [
  { key: '1m', i18nKey: 'chart.1m' },
  { key: '5m', i18nKey: 'chart.5m' },
  { key: '15m', i18nKey: 'chart.15m' },
  { key: '1h', i18nKey: 'chart.1h' },
  { key: '4h', i18nKey: 'chart.4h' },
  { key: '1d', i18nKey: 'chart.1d' },
];

const detailTabKeys: { key: string; i18nKey: TranslationKey }[] = [
  { key: 'orderbook', i18nKey: 'detail.orderbook' },
  { key: 'trades', i18nKey: 'detail.trades' },
];

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { data: asset } = useAssetPrice(symbol);
  const { data: rateData } = useExchangeRate();
  const currencyMode = useCurrencyDisplay((s) => s.display);
  const rate = rateData?.rate;

  const fp = (price: number) => formatPriceDisplay(price, symbol, currencyMode, rate);
  const fa = (amount: number) => formatAmountDisplay(amount, symbol, currencyMode, rate);
  const fv = (volume: number) => formatVolumeDisplay(volume, symbol, currencyMode, rate);

  const chartIntervals = useMemo(
    () => chartIntervalKeys.map((i) => ({ key: i.key, label: t(i.i18nKey) })),
    [t],
  );
  const detailTabs = useMemo(
    () => detailTabKeys.map((i) => ({ key: i.key, label: t(i.i18nKey) })),
    [t],
  );
  const [chartInterval, setChartInterval] = useState('1m');
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const { data: candlesticks, isLoading: chartLoading } = useCandlesticks(symbol, chartInterval);
  const { data: orderBook, isLoading: orderbookLoading } = useOrderBook(symbol);
  const { data: trades, isLoading: tradesLoading } = useRecentTrades(symbol, isAuthenticated);
  const [activeTab, setActiveTab] = useState('orderbook');
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const { data: watchlistSymbols } = useWatchlist();
  const { data: priceAlerts } = usePriceAlerts(symbol);
  const activeAlertCount = priceAlerts?.filter((a) => a.isActive).length ?? 0;
  const addWatchlist = useAddWatchlist();
  const removeWatchlist = useRemoveWatchlist();
  const isWatchlisted = watchlistSymbols?.includes(symbol) ?? false;

  const handleToggleWatchlist = useCallback(() => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    if (isWatchlisted) {
      removeWatchlist.mutate(symbol);
    } else {
      addWatchlist.mutate(symbol);
    }
  }, [isAuthenticated, isWatchlisted, symbol, addWatchlist, removeWatchlist]);

  const [livePrice, setLivePrice] = useState<PriceUpdate | null>(null);

  const handlePriceUpdate = useCallback((update: PriceUpdate) => {
    if (update.symbol === symbol) {
      setLivePrice(update);
    }
  }, [symbol]);

  useWebSocket([symbol], handlePriceUpdate);

  const currentPrice = livePrice?.price ?? asset?.price ?? asset?.currentPrice ?? 0;
  const changePercent = livePrice?.changePercent ?? asset?.changePercent24h ?? asset?.changePercent ?? 0;
  const changeAmount = livePrice?.changeAmount ?? asset?.changeAmount ?? asset?.change24h ?? 0;
  const isRise = changePercent > 0;
  const isFall = changePercent < 0;

  const handleBuySell = (side: 'BUY' | 'SELL') => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    setOrderSide(side);
    setOrderSheetOpen(true);
  };

  const handleLoginConfirm = () => {
    setLoginModalOpen(false);
    router.push('/login');
  };

  return (
    <div className="pb-32">
      {/* 헤더 / Header */}
      <div className="flex items-center gap-3 py-4">
        <Link href="/dashboard" className="p-1.5 -ml-1.5 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary/60">
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[16px] sm:text-[17px] md:text-[18px] font-bold text-text-primary leading-tight truncate">
              {asset?.name ?? symbol}
            </h1>
            <button
              onClick={handleToggleWatchlist}
              className="shrink-0 p-0.5 rounded transition-colors hover:bg-bg-secondary/80"
            >
              <Star
                className={cn(
                  'w-[18px] h-[18px] transition-colors',
                  isWatchlisted ? 'text-yellow-400 fill-yellow-400' : 'text-text-quaternary',
                )}
              />
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) { setLoginModalOpen(true); return; }
                setAlertModalOpen(true);
              }}
              className="shrink-0 p-0.5 rounded transition-colors hover:bg-bg-secondary/80 relative"
            >
              <Bell
                className={cn(
                  'w-[18px] h-[18px] transition-colors',
                  activeAlertCount > 0 ? 'text-accent fill-accent/20' : 'text-text-quaternary',
                )}
              />
              {activeAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeAlertCount}
                </span>
              )}
            </button>
          </div>
          <span className="text-[12px] text-text-quaternary">{symbol}</span>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => handleBuySell('BUY')}
            className="h-9 sm:h-11 px-2.5 sm:px-4 text-[12px] sm:text-[13px] font-bold text-rise border border-rise/30 rounded-md hover:bg-rise hover:text-white transition-colors"
          >
            {t('detail.buy')}
          </button>
          <button
            onClick={() => handleBuySell('SELL')}
            className="h-9 sm:h-11 px-2.5 sm:px-4 text-[12px] sm:text-[13px] font-bold text-fall border border-fall/30 rounded-md hover:bg-fall hover:text-white transition-colors"
          >
            {t('detail.sell')}
          </button>
        </div>
      </div>

      {/* 환율 바 / Exchange Rate Bar */}
      <ExchangeRateBar />

      {/* 현재가 / Price */}
      <div className="pb-5 mt-3">
        <div className="text-[28px] sm:text-[32px] md:text-[34px] font-extrabold tabular-nums text-text-primary leading-tight break-all">
          {fp(currentPrice)}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className={cn(
              'text-[14px] font-bold tabular-nums',
              isRise && 'text-rise',
              isFall && 'text-fall',
              !isRise && !isFall && 'text-text-quaternary',
            )}
          >
            {formatPercent(changePercent)}
          </span>
          {changeAmount !== 0 && (
            <span
              className={cn(
                'text-[13px] tabular-nums',
                isRise && 'text-rise',
                isFall && 'text-fall',
                !isRise && !isFall && 'text-text-quaternary',
              )}
            >
              {fa(changeAmount)}
            </span>
          )}
        </div>
      </div>

      {/* 차트 컨트롤 (항상 표시) / Chart controls (always visible) */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-3 gap-2 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 shrink-0">
            {chartIntervals.map((i) => (
              <button
                key={i.key}
                onClick={() => setChartInterval(i.key)}
                className={cn(
                  'px-2 md:px-2.5 py-1 text-[11px] md:text-[12px] rounded-md transition-colors whitespace-nowrap',
                  chartInterval === i.key
                    ? 'bg-bg-tertiary text-text-primary font-semibold'
                    : 'text-text-quaternary hover:text-text-tertiary',
                )}
              >
                {i.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setChartType('line')}
              className={cn(
                'px-2 md:px-2.5 py-1 text-[11px] md:text-[12px] rounded-md transition-colors whitespace-nowrap',
                chartType === 'line'
                  ? 'bg-bg-tertiary text-text-primary font-semibold'
                  : 'text-text-quaternary hover:text-text-tertiary',
              )}
            >
              {t('chart.line')}
            </button>
            <button
              onClick={() => setChartType('candle')}
              className={cn(
                'px-2 md:px-2.5 py-1 text-[11px] md:text-[12px] rounded-md transition-colors whitespace-nowrap',
                chartType === 'candle'
                  ? 'bg-bg-tertiary text-text-primary font-semibold'
                  : 'text-text-quaternary hover:text-text-tertiary',
              )}
            >
              {t('chart.candle')}
            </button>
          </div>
        </div>

        {/* 차트 본체 / Chart body */}
        {chartLoading || !candlesticks ? (
          <ChartSkeleton />
        ) : candlesticks.length === 0 ? (
          <div className="h-[300px] sm:h-[340px] md:h-[380px] flex items-center justify-center text-text-quaternary text-[14px]">
            {t('detail.noChart')}
          </div>
        ) : (
          <CandlestickChart
            data={candlesticks}
            chartType={chartType}
            exchangeRate={
              isKRW(symbol)
                ? currencyMode !== 'krw' && rate ? 1 / rate : undefined
                : currencyMode === 'krw' && rate ? rate : undefined
            }
            interval={chartInterval}
          />
        )}
      </div>

      {/* 주요 지표 그리드 / Key Metrics Grid */}
      {asset && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-3 mt-5 mb-5 px-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-quaternary">{t('detail.open')}</span>
            <span className="text-[13px] font-semibold tabular-nums text-text-primary">
              {fp(currentPrice - changeAmount)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-quaternary">{t('detail.high')}</span>
            <span className="text-[13px] font-semibold tabular-nums text-rise">
              {fp(asset.high24h ?? 0)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-quaternary">{t('detail.low')}</span>
            <span className="text-[13px] font-semibold tabular-nums text-fall">
              {fp(asset.low24h ?? 0)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-quaternary">{t('detail.volume')}</span>
            <span className="text-[13px] font-semibold tabular-nums text-text-primary">
              {formatQuantity(asset.volume ?? 0)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-quaternary">{t('detail.change')}</span>
            <span className={cn(
              'text-[13px] font-semibold tabular-nums',
              isRise ? 'text-rise' : isFall ? 'text-fall' : 'text-text-primary',
            )}>
              {fa(changeAmount)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-quaternary">{t('detail.changeRate')}</span>
            <span className={cn(
              'text-[13px] font-semibold tabular-nums',
              isRise ? 'text-rise' : isFall ? 'text-fall' : 'text-text-primary',
            )}>
              {formatPercent(changePercent)}
            </span>
          </div>
        </div>
      )}

      {/* 종목 정보 / Asset Info */}
      {asset && (
        <div className="mt-8">
          <h3 className="text-[15px] font-bold text-text-primary mb-3">{t('detail.assetInfo')}</h3>
          <div className="py-1">
            {[
              { label: t('detail.currentPrice'), value: fp(asset.price ?? 0) },
              { label: t('detail.bidPrice'), value: fp(asset.bid ?? 0) },
              { label: t('detail.askPrice'), value: fp(asset.ask ?? 0) },
              { label: t('detail.spread'), value: fp((asset.ask ?? 0) - (asset.bid ?? 0)) },
              { label: t('detail.high24h'), value: fp(asset.high24h ?? 0) },
              { label: t('detail.low24h'), value: fp(asset.low24h ?? 0) },
              { label: t('detail.volume24h'), value: formatQuantity(asset.volume ?? 0) },
              { label: t('detail.turnover24h'), value: fv((asset.volume ?? 0) * (asset.price ?? 0)) },
              { label: t('detail.assetType'), value: asset.type === 'CRYPTO' ? t('detail.crypto') : asset.type === 'STOCK' ? t('detail.stock') : '-' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between py-3.5 border-b border-border/50 gap-3"
              >
                <span className="text-[13px] md:text-[14px] text-text-tertiary shrink-0">
                  {item.label}
                </span>
                <span className="text-[13px] md:text-[14px] text-text-primary font-semibold tabular-nums text-right truncate">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 탭 — 로그인 시에만 표시 / Tabs — only visible when authenticated */}
      {isAuthenticated && <div className="mt-5">
        <Tabs tabs={detailTabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-3">
          {activeTab === 'orderbook' && orderbookLoading && (
            <div className="space-y-2 py-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-6 rounded bg-bg-secondary animate-pulse" />
              ))}
            </div>
          )}
          {activeTab === 'orderbook' && !orderbookLoading && orderBook && (
            <OrderBookComponent orderBook={orderBook} />
          )}

          {activeTab === 'trades' && tradesLoading && (
            <div className="space-y-2 py-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-6 rounded bg-bg-secondary animate-pulse" />
              ))}
            </div>
          )}
          {activeTab === 'trades' && !tradesLoading && (
            <div>
              <div className="flex text-[11px] md:text-[12px] text-text-quaternary py-2.5 font-medium">
                <span className="flex-1 min-w-0">{t('detail.tradePrice')}</span>
                <span className="flex-1 text-center min-w-0">{t('detail.tradeQuantity')}</span>
                <span className="flex-1 text-right min-w-0">{t('detail.tradeTime')}</span>
              </div>
              {trades?.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center py-2 text-[13px] md:text-[14px]"
                >
                  <span
                    className={cn(
                      'flex-1 tabular-nums font-medium min-w-0 truncate',
                      trade.side === 'BUY' ? 'text-rise' : 'text-fall',
                    )}
                  >
                    {fp(trade.price)}
                  </span>
                  <span className="flex-1 text-center tabular-nums text-text-secondary min-w-0 truncate">
                    {formatQuantity(trade.quantity)}
                  </span>
                  <span className="flex-1 text-right text-[11px] md:text-[12px] text-text-quaternary min-w-0">
                    {formatTime(trade.timestamp)}
                  </span>
                </div>
              ))}
              {(!trades || trades.length === 0) && (
                <div className="py-16 text-center text-text-quaternary text-[14px]">
                  {t('detail.noTrades')}
                </div>
              )}
            </div>
          )}

        </div>
      </div>}

      {/* 주문 모달 / Order Modal */}
      <OrderSheet
        isOpen={orderSheetOpen}
        onClose={() => setOrderSheetOpen(false)}
        symbol={symbol}
        currentPrice={currentPrice}
        initialSide={orderSide}
      />

      {/* 가격 알림 모달 / Price Alert Modal */}
      <PriceAlertModal
        isOpen={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
        symbol={symbol}
        currentPrice={currentPrice}
      />

      {/* 로그인 필요 모달 / Login Required Modal */}
      <ConfirmModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onConfirm={handleLoginConfirm}
        title={t('modal.loginRequired')}
        message={t('modal.loginRequiredMessage')}
        confirmLabel={t('modal.loginConfirm')}
        cancelLabel={t('modal.cancel')}
      />
    </div>
  );
}
