/**
 * @file 주문 폼 컴포넌트
 * @description 시장가/지정가/손절/익절 매수/매도 주문을 입력하는 폼
 *
 * @file Order Form Component
 * @description Form for entering market/limit/stop-loss/take-profit buy/sell orders
 */
'use client';

import { useState, useMemo } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import { usePlaceOrder } from '@/hooks/useOrders';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import { useToastStore } from '@/stores/toast';
import { formatPriceDisplay, isKRW } from '@/lib/format';
import type { TranslationKey } from '@/lib/i18n';

interface OrderFormProps {
  symbol: string;
  currentPrice: number;
  side: 'BUY' | 'SELL';
  onSuccess?: () => void;
}

type OrderFormType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';

const typeTabKeys: { key: string; i18nKey: TranslationKey }[] = [
  { key: 'MARKET', i18nKey: 'order.market' },
  { key: 'LIMIT', i18nKey: 'order.limit' },
  { key: 'STOP_LOSS', i18nKey: 'order.stopLoss' },
  { key: 'TAKE_PROFIT', i18nKey: 'order.takeProfit' },
];

export default function OrderForm({
  symbol,
  currentPrice,
  side,
  onSuccess,
}: OrderFormProps) {
  const { t } = useTranslation();
  const { data: rateData } = useExchangeRate();
  const currencyMode = useCurrencyDisplay((s) => s.display);
  const rate = rateData?.rate;
  const [orderType, setOrderType] = useState<OrderFormType>('MARKET');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(currentPrice.toString());
  const [triggerPrice, setTriggerPrice] = useState('');
  const [quantityError, setQuantityError] = useState('');
  const [priceError, setPriceError] = useState('');
  const placeOrder = usePlaceOrder();
  const { data: portfolio } = usePortfolio();

  const typeTabs = useMemo(
    () => typeTabKeys.map((i) => ({ key: i.key, label: t(i.i18nKey) })),
    [t],
  );

  const isBuy = side === 'BUY';
  const isConditional = orderType === 'STOP_LOSS' || orderType === 'TAKE_PROFIT';

  const safeCurrentPrice = Number.isFinite(currentPrice) ? currentPrice : 0;
  const estimatedTotal = isConditional
    ? parseFloat(quantity || '0') * parseFloat(triggerPrice || '0')
    : orderType === 'MARKET'
      ? parseFloat(quantity || '0') * safeCurrentPrice
      : parseFloat(quantity || '0') * parseFloat(price || '0');

  const fp = (p: number) => formatPriceDisplay(p, symbol, currencyMode, rate);

  const validateQuantity = () => {
    if (quantity && parseFloat(quantity) <= 0) {
      setQuantityError(t('order.quantityPlaceholder'));
    } else {
      setQuantityError('');
    }
  };

  const validatePrice = () => {
    if (price && parseFloat(price) <= 0) {
      setPriceError(t('order.pricePlaceholder'));
    } else {
      setPriceError('');
    }
  };

  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) return;
    if (isConditional && (!triggerPrice || parseFloat(triggerPrice) <= 0)) return;

    try {
      await placeOrder.mutateAsync({
        symbol,
        side,
        // 조건부 주문은 MARKET 타입으로 전송 / Conditional orders sent as MARKET type
        type: isConditional ? 'MARKET' : orderType as 'MARKET' | 'LIMIT',
        quantity: parseFloat(quantity),
        ...(orderType === 'LIMIT' ? { price: parseFloat(price) } : {}),
        ...(isConditional
          ? {
              triggerPrice: parseFloat(triggerPrice),
              triggerType: orderType as 'STOP_LOSS' | 'TAKE_PROFIT',
            }
          : {}),
      });
      setQuantity('');
      setTriggerPrice('');
      onSuccess?.();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      let message = axiosError?.response?.data?.message || (error instanceof Error ? error.message : '');
      // 백엔드 에러 메시지를 사용자 친화적 한국어로 변환
      if (message.includes('Insufficient funds')) {
        message = t('order.insufficientFunds');
      } else if (!message) {
        message = t('order.error');
      }
      useToastStore.getState().addToast(message, 'error');
    }
  };

  return (
    <div className="space-y-5">
      <Tabs
        tabs={typeTabs}
        activeTab={orderType}
        onChange={(key) => setOrderType(key as OrderFormType)}
        variant="pill"
      />

      {/* 조건부 주문 설명 / Conditional order description */}
      {isConditional && (
        <p className="text-[11px] text-text-quaternary leading-relaxed">
          {orderType === 'STOP_LOSS'
            ? t('order.stopLossDesc')
            : t('order.takeProfitDesc')}
        </p>
      )}

      {orderType === 'LIMIT' && (
        <div>
          <Input
            label={`${t('order.price')} (${currencyMode === 'krw' ? 'KRW' : 'USD'})`}
            type="number"
            value={price}
            onChange={(e) => { setPrice(e.target.value); setPriceError(''); }}
            onBlur={validatePrice}
            placeholder={t('order.pricePlaceholder')}
            aria-describedby={priceError ? 'price-error' : undefined}
          />
          {priceError && <p id="price-error" className="text-[11px] text-danger mt-1">{priceError}</p>}
        </div>
      )}

      {isConditional && (
        <Input
          label={`${t('order.triggerPrice')} (${currencyMode === 'krw' ? 'KRW' : 'USD'})`}
          type="number"
          value={triggerPrice}
          onChange={(e) => setTriggerPrice(e.target.value)}
          placeholder={t('order.triggerPricePlaceholder')}
        />
      )}

      <div>
        <Input
          label={t('order.quantity')}
          type="number"
          value={quantity}
          onChange={(e) => { setQuantity(e.target.value); setQuantityError(''); }}
          onBlur={validateQuantity}
          placeholder={t('order.quantityPlaceholder')}
          aria-describedby={quantityError ? 'quantity-error' : undefined}
        />
        {quantityError && <p id="quantity-error" className="text-[11px] text-danger mt-1">{quantityError}</p>}
      </div>

      <div className="space-y-1.5 py-3">
        <div className="flex justify-between text-[14px]">
          <span className="text-text-tertiary">{t('order.estimatedTotal')}</span>
          <span className="text-text-primary font-bold tabular-nums">
            {Number.isFinite(estimatedTotal) ? fp(estimatedTotal) : fp(0)}
          </span>
        </div>
        {portfolio && (
          <div className="flex justify-between text-[13px]">
            <span className="text-text-quaternary">{t('order.available')}</span>
            <span className="text-text-tertiary tabular-nums">
              {isBuy
                ? fp(portfolio.cashBalance)
                : `${(portfolio.holdings.find((h) => h.symbol === symbol)?.quantity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 8 })} ${symbol.replace('USDT', '')}`
              }
            </span>
          </div>
        )}
      </div>

      <Button
        variant={isBuy ? 'buy' : 'sell'}
        size="lg"
        fullWidth
        onClick={handleSubmit}
        aria-label={isBuy ? t('detail.buy') : t('detail.sell')}
        disabled={
          placeOrder.isPending ||
          !quantity ||
          parseFloat(quantity) <= 0 ||
          (isConditional && (!triggerPrice || parseFloat(triggerPrice) <= 0))
        }
      >
        {placeOrder.isPending
          ? t('order.submitting')
          : isBuy
            ? `${fp(safeCurrentPrice)} ${t('detail.buy')}`
            : `${fp(safeCurrentPrice)} ${t('detail.sell')}`}
      </Button>
    </div>
  );
}
