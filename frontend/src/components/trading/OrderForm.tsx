/**
 * @file 주문 폼 컴포넌트
 * @description 시장가/지정가 매수/매도 주문을 입력하는 폼
 *
 * @file Order Form Component
 * @description Form for entering market/limit buy/sell orders
 */
'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import { usePlaceOrder } from '@/hooks/useOrders';
import { formatPrice } from '@/lib/format';

interface OrderFormProps {
  symbol: string;
  currentPrice: number;
  side: 'BUY' | 'SELL';
  onSuccess?: () => void;
}

const typeTabs = [
  { key: 'MARKET', label: '시장가' },
  { key: 'LIMIT', label: '지정가' },
];

export default function OrderForm({
  symbol,
  currentPrice,
  side,
  onSuccess,
}: OrderFormProps) {
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(currentPrice.toString());
  const placeOrder = usePlaceOrder();

  const isBuy = side === 'BUY';
  const estimatedTotal =
    orderType === 'MARKET'
      ? parseFloat(quantity || '0') * currentPrice
      : parseFloat(quantity || '0') * parseFloat(price || '0');

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
          label="가격"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="주문 가격"
        />
      )}

      <Input
        label="수량"
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="주문 수량"
      />

      <div className="flex justify-between py-3 text-[14px]">
        <span className="text-text-tertiary">예상 금액</span>
        <span className="text-text-primary font-bold tabular-nums">
          {formatPrice(estimatedTotal)} 원
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
          ? '주문 중...'
          : isBuy
            ? `${formatPrice(currentPrice)} 매수`
            : `${formatPrice(currentPrice)} 매도`}
      </Button>
    </div>
  );
}
