/**
 * @file 거래 내역 리스트
 * @description 입출금, 매수/매도 거래 내역을 시간순으로 표시합니다
 *
 * @file Transaction List Component
 * @description Displays deposit/withdrawal and trade transactions chronologically
 */
'use client';

import { cn, formatQuantity, formatDate, formatPriceDisplay } from '@/lib/format';
import { useTranslation } from '@/hooks/useTranslation';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import type { Order } from '@/types';

// 거래 내역 Props / Transaction List Props
interface TransactionListProps {
  /** 주문 내역 배열 / Array of order records */
  orders: Order[];
}

export default function TransactionList({ orders }: TransactionListProps) {
  const { t } = useTranslation();
  const { data: rateData } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const rate = rateData?.rate;
  const fmtPrice = (v: number, symbol: string) => formatPriceDisplay(v, symbol, currencyMode, rate);
  const fmtTotal = (v: number, symbol: string) => formatPriceDisplay(v, symbol, currencyMode, rate);

  if (orders.length === 0) {
    return (
      <div className="py-24 text-center text-text-quaternary text-[14px]">
        {t('orders.noOrders')}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {orders.map((order) => (
        <div key={order.id} className="py-3.5">
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
                  {' '}@ {fmtPrice(order.triggerPrice!, order.symbol)}
                </span>
              )}
              <span className="text-[13px] md:text-[14px] font-semibold text-text-primary truncate">
                {order.symbol}
              </span>
            </div>
            <span
              className={cn(
                'text-[11px] md:text-[12px] font-semibold px-2 md:px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap',
                order.status === 'FILLED' && 'bg-success/10 text-success',
                order.status === 'PENDING' && 'bg-warning/10 text-warning',
                order.status === 'CANCELLED' && 'bg-bg-tertiary text-text-quaternary',
                order.status === 'PARTIALLY_FILLED' && 'bg-accent/10 text-accent',
              )}
            >
              {order.status === 'FILLED'
                ? t('orders.filled')
                : order.status === 'PENDING'
                  ? t('orders.pending')
                  : order.status === 'CANCELLED'
                    ? t('orders.cancelled')
                    : t('orders.filled')}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 gap-2">
            <span className="text-[11px] md:text-[12px] text-text-quaternary truncate">
              {formatQuantity(order.quantity)}{t('orders.unit')} ·{' '}
              {order.price ? fmtPrice(order.price, order.symbol) : t('orders.marketPrice')}
            </span>
            <span className="text-[11px] md:text-[12px] text-text-quaternary shrink-0">
              {formatDate(order.createdAt)}
            </span>
          </div>
          {/* 체결 정보 / Filled info */}
          {order.filledPrice != null && order.filledQuantity > 0 && (
            <div className="flex items-center justify-between mt-1.5 px-0.5 gap-2 flex-wrap md:flex-nowrap">
              <span className="text-[10px] md:text-[11px] text-text-tertiary truncate">
                {t('orders.filledPrice')} {fmtPrice(order.filledPrice, order.symbol)} · {t('orders.filledQuantity')} {formatQuantity(order.filledQuantity)}{t('orders.unit')}
              </span>
              <span className="text-[10px] md:text-[11px] font-medium text-text-secondary shrink-0">
                {t('orders.totalAmount')} {fmtTotal(order.filledPrice * order.filledQuantity, order.symbol)}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
