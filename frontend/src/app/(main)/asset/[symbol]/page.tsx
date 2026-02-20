/**
 * @file 종목 상세 페이지
 * @description 개별 종목의 차트, 호가창, 주문 폼을 보여주는 상세 페이지
 *
 * @file Asset Detail Page
 * @description Detail page showing chart, order book, and order form for an asset
 */
'use client';

import { useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAssetPrice, useCandlesticks, useOrderBook, useRecentTrades } from '@/hooks/useMarket';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/stores/auth';
import CandlestickChart from '@/components/chart/CandlestickChart';
import OrderBookComponent from '@/components/trading/OrderBook';
import OrderSheet from '@/components/trading/OrderSheet';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Tabs from '@/components/ui/Tabs';
import { ChartSkeleton } from '@/components/ui/Skeleton';
import { cn, formatPrice, formatPercent, formatQuantity, formatTime, formatVolume } from '@/lib/format';
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
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { data: asset } = useAssetPrice(symbol);
  const [chartInterval, setChartInterval] = useState('1h');
  const { data: candlesticks, isLoading: chartLoading } = useCandlesticks(symbol, chartInterval);
  const { data: orderBook } = useOrderBook(symbol);
  const { data: trades } = useRecentTrades(symbol, isAuthenticated);
  const [activeTab, setActiveTab] = useState('orderbook');
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
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
    router.push('/auth/login');
  };

  return (
    <div className="pb-8">
      {/* 헤더 / Header */}
      <div className="flex items-center gap-3 py-4">
        <Link href="/" className="p-1.5 -ml-1.5 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary/60">
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] sm:text-[17px] font-bold text-text-primary leading-tight truncate">
            {asset?.name ?? symbol}
          </h1>
          <span className="text-[12px] text-text-quaternary">{symbol}</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => handleBuySell('BUY')}
            className="h-8 px-3 text-[12px] font-bold text-rise border border-rise/30 rounded-md hover:bg-rise hover:text-white transition-colors"
          >
            매수
          </button>
          <button
            onClick={() => handleBuySell('SELL')}
            className="h-8 px-3 text-[12px] font-bold text-fall border border-fall/30 rounded-md hover:bg-fall hover:text-white transition-colors"
          >
            매도
          </button>
        </div>
      </div>

      {/* 현재가 / Price */}
      <div className="pb-5">
        <div className="text-[28px] sm:text-[32px] font-extrabold tabular-nums text-text-primary leading-tight">
          {formatPrice(currentPrice)}
          <span className="text-[16px] text-text-tertiary ml-1">원</span>
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
            {isRise && '+'}{formatPercent(changePercent)}
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
              {changeAmount > 0 && '+'}{formatPrice(changeAmount)}
            </span>
          )}
        </div>
      </div>

      {/* 차트 / Chart */}
      <div className="px-1">
        {chartLoading || !candlesticks ? (
          <ChartSkeleton />
        ) : (
          <CandlestickChart
            data={candlesticks}
            interval={chartInterval}
            onIntervalChange={setChartInterval}
          />
        )}
      </div>

      {/* 주요 지표 그리드 / Key Metrics Grid */}
      {asset && (
        <div className="grid grid-cols-3 gap-x-4 gap-y-3 mt-5 mb-5 px-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-quaternary">시가</span>
            <span className="text-[13px] font-semibold tabular-nums text-text-primary">
              {formatPrice(currentPrice - changeAmount)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-quaternary">고가</span>
            <span className="text-[13px] font-semibold tabular-nums text-rise">
              {formatPrice(asset.high24h ?? 0)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-quaternary">저가</span>
            <span className="text-[13px] font-semibold tabular-nums text-fall">
              {formatPrice(asset.low24h ?? 0)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-quaternary">거래량</span>
            <span className="text-[13px] font-semibold tabular-nums text-text-primary">
              {formatVolume(asset.volume ?? 0)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-quaternary">전일대비</span>
            <span className={cn(
              'text-[13px] font-semibold tabular-nums',
              isRise ? 'text-rise' : isFall ? 'text-fall' : 'text-text-primary',
            )}>
              {changeAmount > 0 && '+'}{formatPrice(changeAmount)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-quaternary">변동률</span>
            <span className={cn(
              'text-[13px] font-semibold tabular-nums',
              isRise ? 'text-rise' : isFall ? 'text-fall' : 'text-text-primary',
            )}>
              {isRise && '+'}{formatPercent(changePercent)}
            </span>
          </div>
        </div>
      )}

      {/* 탭 / Tabs */}
      <div className="mt-3">
        <Tabs tabs={detailTabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-3">
          {activeTab === 'orderbook' && orderBook && (
            <OrderBookComponent orderBook={orderBook} />
          )}

          {activeTab === 'trades' && (
            <div>
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
                { label: '스프레드', value: formatPrice((asset.ask ?? 0) - (asset.bid ?? 0)) },
                { label: '24h 최고', value: formatPrice(asset.high24h ?? 0) },
                { label: '24h 최저', value: formatPrice(asset.low24h ?? 0) },
                { label: '24h 거래량', value: formatQuantity(asset.volume ?? 0) },
                { label: '24h 거래대금', value: formatVolume((asset.volume ?? 0) * (asset.price ?? 0)) },
                { label: '자산 유형', value: asset.type === 'CRYPTO' ? '암호화폐' : asset.type === 'STOCK' ? '주식' : '-' },
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

      {/* 주문 모달 / Order Modal */}
      <OrderSheet
        isOpen={orderSheetOpen}
        onClose={() => setOrderSheetOpen(false)}
        symbol={symbol}
        currentPrice={currentPrice}
        initialSide={orderSide}
      />

      {/* 로그인 필요 모달 / Login Required Modal */}
      <ConfirmModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onConfirm={handleLoginConfirm}
        title="로그인이 필요합니다"
        message="매수/매도 기능을 이용하려면 로그인이 필요합니다.\n로그인 하시겠습니까?"
        confirmLabel="로그인"
        cancelLabel="취소"
      />
    </div>
  );
}
