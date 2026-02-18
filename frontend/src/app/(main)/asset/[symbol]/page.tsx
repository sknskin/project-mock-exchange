/**
 * @file 종목 상세 페이지
 * @description 개별 종목의 차트, 호가창, 주문 폼을 보여주는 상세 페이지
 *
 * @file Asset Detail Page
 * @description Detail page showing chart, order book, and order form for an asset
 */
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
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 py-4">
        <Link href="/" className="p-1.5 -ml-1.5 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary/60">
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </Link>
        <div>
          <h1 className="text-[16px] sm:text-[17px] font-bold text-text-primary leading-tight">
            {asset?.name ?? symbol}
          </h1>
          <span className="text-[12px] text-text-quaternary">{symbol}</span>
        </div>
      </div>

      {/* Price */}
      <div className="pb-5">
        <div className="text-[28px] sm:text-[32px] font-extrabold tabular-nums text-text-primary leading-tight">
          {formatPrice(currentPrice)}
          <span className="text-[16px] text-text-tertiary ml-1">원</span>
        </div>
        <div
          className={cn(
            'text-[14px] font-bold tabular-nums mt-1.5',
            isRise && 'text-rise',
            isFall && 'text-fall',
            !isRise && !isFall && 'text-text-quaternary',
          )}
        >
          {isRise && '+'}{formatPercent(changePercent)}
        </div>
      </div>

      {/* Chart */}
      <div className="px-1">
        {chartLoading || !candlesticks ? (
          <ChartSkeleton />
        ) : (
          <CandlestickChart data={candlesticks} />
        )}
      </div>

      {/* Tabs */}
      <div className="mt-5">
        <Tabs tabs={detailTabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-3">
          {activeTab === 'orderbook' && orderBook && (
            <OrderBookComponent orderBook={orderBook} />
          )}

          {activeTab === 'trades' && (
            <div className="">
              <div className="flex text-[12px] text-text-quaternary py-2.5 font-medium">
                <span className="flex-1">가격</span>
                <span className="flex-1 text-center">수량</span>
                <span className="flex-1 text-right">시간</span>
              </div>
              {trades?.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center py-2 text-[14px]"
                >
                  <span
                    className={cn(
                      'flex-1 tabular-nums font-medium',
                      trade.side === 'BUY' ? 'text-rise' : 'text-fall',
                    )}
                  >
                    {formatPrice(trade.price)}
                  </span>
                  <span className="flex-1 text-center tabular-nums text-text-secondary">
                    {formatQuantity(trade.quantity)}
                  </span>
                  <span className="flex-1 text-right text-[12px] text-text-quaternary">
                    {formatTime(trade.timestamp)}
                  </span>
                </div>
              ))}
              {(!trades || trades.length === 0) && (
                <div className="py-16 text-center text-text-quaternary text-[14px]">
                  체결 내역이 없습니다
                </div>
              )}
            </div>
          )}

          {activeTab === 'info' && asset && (
            <div className="py-2">
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
                  className="flex justify-between py-3.5 border-b border-border/50"
                >
                  <span className="text-[14px] text-text-tertiary">
                    {item.label}
                  </span>
                  <span className="text-[14px] text-text-primary font-semibold tabular-nums">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="fixed bottom-[52px] md:bottom-0 left-0 right-0 bg-bg-primary/95 backdrop-blur-md border-t border-border px-5 sm:px-8 lg:px-10 py-3 flex gap-3 max-w-[1080px] mx-auto safe-bottom">
        <button
          onClick={() => setOrderSheetOpen(true)}
          className="flex-1 h-12 bg-rise text-white font-bold rounded-lg hover:bg-rise/90 transition-colors text-[15px]"
        >
          매수
        </button>
        <button
          onClick={() => setOrderSheetOpen(true)}
          className="flex-1 h-12 bg-fall text-white font-bold rounded-lg hover:bg-fall/90 transition-colors text-[15px]"
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
