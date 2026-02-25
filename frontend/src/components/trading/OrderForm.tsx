/**
 * @file 주문 폼 컴포넌트
 * @description 시장가/지정가 매수/매도 주문을 입력하는 폼
 *
 * @file Order Form Component
 * @description Form for entering market/limit buy/sell orders
 */
'use client';

import { useState, useMemo } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import { usePlaceOrder } from '@/hooks/useOrders';
import { useTranslation } from '@/hooks/useTranslation';
import { formatPriceDisplay, isKRW } from '@/lib/format';
import type { TranslationKey } from '@/lib/i18n';

interface OrderFormProps {
  symbol: string;
  currentPrice: number;
  side: 'BUY' | 'SELL';
  onSuccess?: () => void;
}

const typeTabKeys: { key: string; i18nKey: TranslationKey }[] = [
  { key: 'MARKET', i18nKey: 'order.market' },
  { key: 'LIMIT', i18nKey: 'order.limit' },
];

export default function OrderForm({
  symbol,
  currentPrice,
  side,
  onSuccess,
}: OrderFormProps) {
  const { t } = useTranslation();
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(currentPrice.toString());
  const placeOrder = usePlaceOrder();

  const typeTabs = useMemo(
    () => typeTabKeys.map((i) => ({ key: i.key, label: t(i.i18nKey) })),
    [t],
  );

  const isBuy = side === 'BUY';
  const estimatedTotal =
    orderType === 'MARKET'
      ? parseFloat(quantity || '0') * currentPrice
      : parseFloat(quantity || '0') * parseFloat(price || '0');

  // 종목의 원래 통화로 표시 (Display in asset's native currency)
  const fp = (p: number) => formatPriceDisplay(p, symbol, 'original');

  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) return;

    try {
      await placeOrder.mutateAsync({
        symbol,
        side,
        type: orderType,
        quantity: parseFloat(quantity),
        ...(orderType === 'LIMIT' ? { price: parseFloat(price) } : {}),
      });
      setQuantity('');
      onSuccess?.();
    } catch {
      // 에러는 쿼리 클라이언트에서 처리 / Error handled by query client
    }
  };

  return (
    <div className="space-y-5">
      <Tabs
        tabs={typeTabs}
        activeTab={orderType}
        onChange={(key) => setOrderType(key as 'MARKET' | 'LIMIT')}
        variant="pill"
      />

      {orderType === 'LIMIT' && (
        <Input
          label={`${t('order.price')} (${isKRW(symbol) ? 'KRW' : 'USD'})`}
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={t('order.pricePlaceholder')}
        />
      )}

      <Input
        label={t('order.quantity')}
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder={t('order.quantityPlaceholder')}
      />

      <div className="flex justify-between py-3 text-[14px]">
        <span className="text-text-tertiary">{t('order.estimatedTotal')}</span>
        <span className="text-text-primary font-bold tabular-nums">
          {fp(estimatedTotal)}
        </span>
      </div>

      <Button
        variant={isBuy ? 'buy' : 'sell'}
        size="lg"
        fullWidth
        onClick={handleSubmit}
        disabled={
          placeOrder.isPending || !quantity || parseFloat(quantity) <= 0
        }
      >
        {placeOrder.isPending
          ? t('order.submitting')
          : isBuy
            ? `${fp(currentPrice)} ${t('detail.buy')}`
            : `${fp(currentPrice)} ${t('detail.sell')}`}
      </Button>
    </div>
  );
}
