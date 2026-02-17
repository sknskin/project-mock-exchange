'use client';

import { useState, useCallback, use } from 'react';
import { useAssetPrice, useCandlesticks, useOrderBook, useRecentTrades } from '@/hooks/useMarket';
import { useWebSocket } from '@/hooks/useWebSocket';
import CandlestickChart from '@/components/chart/CandlestickChart';
import OrderBookComponent from '@/components/trading/OrderBook';
import OrderSheet from '@/components/trading/OrderSheet';
import Tabs from '@/components/ui/Tabs';
import { ChartSkeleton } from '@/components/ui/Skeleton';
import { cn, formatPrice, formatPercent, formatQuantity, formatTime } from '@/lib/format';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { PriceUpdate } from '@/types';

const detailTabs = [
  { key: 'orderbook', label: '호가' },
  { key: 'trades', label: '체결' },
  { key: 'info', label: '정보' },
];

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const { data: asset } = useAssetPrice(symbol);
  const { data: candlesticks, isLoading: chartLoading } = useCandlesticks(symbol);
  const { data: orderBook } = useOrderBook(symbol);
  const { data: trades } = useRecentTrades(symbol);
  const [activeTab, setActiveTab] = useState('orderbook');
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [livePrice, setLivePrice] = useState<PriceUpdate | null>(null);

  const handlePriceUpdate = useCallback((update: PriceUpdate) => {
    if (update.symbol === symbol) {
      setLivePrice(update);
    }
  }, [symbol]);

  useWebSocket([symbol], handlePriceUpdate);

  const currentPrice = livePrice?.price ?? asset?.price ?? asset?.currentPrice ?? 0;
  const changePercent = livePrice?.changePercent ?? asset?.changePercent24h ?? asset?.changePercent ?? 0;
  const isRise = changePercent > 0;
  const isFall = changePercent < 0;

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <Link href="/" className="text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-text-primary">
            {asset?.name ?? symbol}
          </h1>
          <span className="text-xs text-text-secondary">{symbol}</span>
        </div>
      </div>

      {/* Price */}
      <div className="px-5 pb-4">
        <div
          className={cn(
            'text-3xl font-bold tabular-nums',
            isRise && 'text-rise',
            isFall && 'text-fall',
            !isRise && !isFall && 'text-text-primary',
          )}
        >
          {formatPrice(currentPrice)}
        </div>
        <div
          className={cn(
            'text-sm tabular-nums mt-1',
            isRise && 'text-rise',
            isFall && 'text-fall',
            !isRise && !isFall && 'text-text-secondary',
          )}
        >
          {formatPercent(changePercent)}
        </div>
      </div>

      {/* Chart */}
      <div className="px-2">
        {chartLoading || !candlesticks ? (
          <ChartSkeleton />
        ) : (
          <CandlestickChart data={candlesticks} />
        )}
      </div>

      {/* Tabs */}
      <div className="mt-4">
        <Tabs tabs={detailTabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-2">
          {activeTab === 'orderbook' && orderBook && (
            <OrderBookComponent orderBook={orderBook} />
          )}

          {activeTab === 'trades' && (
            <div className="px-4">
              <div className="flex text-xs text-text-tertiary py-2 border-b border-border">
                <span className="flex-1">가격</span>
                <span className="flex-1 text-center">수량</span>
                <span className="flex-1 text-right">시간</span>
              </div>
              {trades?.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center py-1.5 text-sm"
                >
                  <span
                    className={cn(
                      'flex-1 tabular-nums',
                      trade.side === 'BUY' ? 'text-rise' : 'text-fall',
                    )}
                  >
                    {formatPrice(trade.price)}
                  </span>
                  <span className="flex-1 text-center tabular-nums text-text-secondary">
                    {formatQuantity(trade.quantity)}
                  </span>
                  <span className="flex-1 text-right text-xs text-text-tertiary">
                    {formatTime(trade.timestamp)}
                  </span>
                </div>
              ))}
              {(!trades || trades.length === 0) && (
                <div className="py-12 text-center text-text-secondary text-sm">
                  체결 내역이 없습니다
                </div>
              )}
            </div>
          )}

          {activeTab === 'info' && asset && (
            <div className="px-5 space-y-3 py-2">
              {[
                { label: '현재가', value: formatPrice(asset.price ?? 0) },
                { label: '매수호가', value: formatPrice(asset.bid ?? 0) },
                { label: '매도호가', value: formatPrice(asset.ask ?? 0) },
                { label: '24h 최고', value: formatPrice(asset.high24h ?? 0) },
                { label: '24h 최저', value: formatPrice(asset.low24h ?? 0) },
                { label: '24h 거래량', value: formatQuantity(asset.volume ?? 0) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between py-2 border-b border-border"
                >
                  <span className="text-sm text-text-secondary">
                    {item.label}
                  </span>
                  <span className="text-sm text-text-primary tabular-nums">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="fixed bottom-14 md:bottom-0 left-0 right-0 bg-bg-primary border-t border-border p-4 flex gap-3 max-w-screen-xl mx-auto">
        <button
          onClick={() => setOrderSheetOpen(true)}
          className="flex-1 py-3 bg-rise text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          매수
        </button>
        <button
          onClick={() => setOrderSheetOpen(true)}
          className="flex-1 py-3 bg-fall text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          매도
        </button>
      </div>

      <OrderSheet
        isOpen={orderSheetOpen}
        onClose={() => setOrderSheetOpen(false)}
        symbol={symbol}
        currentPrice={currentPrice}
      />
    </div>
  );
}
