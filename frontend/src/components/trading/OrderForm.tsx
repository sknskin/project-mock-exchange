/**
 * @file 주문 폼 컴포넌트
 * @description 시장가/지정가/손절/익절 매수/매도 주문을 입력하는 폼
 *
 * @file Order Form Component
 * @description Form for entering market/limit/stop-loss/take-profit buy/sell orders
 */
'use client';

import { useState, useMemo, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import { usePlaceOrder } from '@/hooks/useOrders';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useTranslation } from '@/hooks/useTranslation';
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

/** 표시 가격을 현재 통화 모드에 맞게 변환 (Display price → current currency mode) */
function toDisplayPrice(usdPrice: number, symbol: string, currencyMode: 'krw' | 'original', rate?: number): number {
  if (!Number.isFinite(usdPrice)) return 0;
  const wantKRW = currencyMode === 'krw';
  if (isKRW(symbol)) return usdPrice;
  if (wantKRW && rate) return Math.round(usdPrice * rate);
  return usdPrice;
}

/** 입력된 가격을 USD(백엔드 기준)로 변환 (Input price → USD for backend) */
function toUsdPrice(inputPrice: number, symbol: string, currencyMode: 'krw' | 'original', rate?: number): number {
  if (!Number.isFinite(inputPrice)) return 0;
  const wantKRW = currencyMode === 'krw';
  if (isKRW(symbol)) return inputPrice;
  if (wantKRW && rate && rate > 0) return inputPrice / rate;
  return inputPrice;
}

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
  const [price, setPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [quantityError, setQuantityError] = useState('');
  const [priceError, setPriceError] = useState('');
  const placeOrder = usePlaceOrder();
  const { data: portfolio } = usePortfolio();

  // currentPrice 또는 통화 모드 변경 시 지정가 갱신 (Sync limit price with currentPrice/currency)
  useEffect(() => {
    const safePrice = Number.isFinite(currentPrice) ? currentPrice : 0;
    if (safePrice > 0) {
      const displayPrice = toDisplayPrice(safePrice, symbol, currencyMode, rate);
      setPrice(displayPrice.toString());
    }
  }, [currentPrice, symbol, currencyMode, rate]);

  const typeTabs = useMemo(
    () => typeTabKeys.map((i) => ({ key: i.key, label: t(i.i18nKey) })),
    [t],
  );

  const isBuy = side === 'BUY';
  const isConditional = orderType === 'STOP_LOSS' || orderType === 'TAKE_PROFIT';

  const safeCurrentPrice = Number.isFinite(currentPrice) ? currentPrice : 0;

  // 보유 자산 정보 (Holdings info)
  const holding = portfolio?.holdings.find((h) => h.symbol === symbol);
  const holdingQty = holding?.quantity ?? 0;
  const holdingValue = holding?.value ?? 0;

  // 매도 시 보유 수량 부족 여부 (Insufficient holdings for sell)
  const parsedQty = parseFloat(quantity || '0');
  const insufficientHoldings = !isBuy && parsedQty > 0 && parsedQty > holdingQty;
  const noHoldings = !isBuy && holdingQty <= 0;

  // 예상 금액 계산 — 표시 통화 기준 (Estimated total in display currency)
  const displayCurrentPrice = toDisplayPrice(safeCurrentPrice, symbol, currencyMode, rate);
  const estimatedTotal = isConditional
    ? parsedQty * parseFloat(triggerPrice || '0')
    : orderType === 'MARKET'
      ? parsedQty * displayCurrentPrice
      : parsedQty * parseFloat(price || '0');

  const fp = (p: number) => formatPriceDisplay(p, symbol, currencyMode, rate);
  const currencyLabel = isKRW(symbol) ? 'KRW' : currencyMode === 'krw' ? 'KRW' : 'USD';

  const validateQuantity = () => {
    if (quantity && parsedQty <= 0) {
      setQuantityError(t('order.quantityPlaceholder'));
    } else if (insufficientHoldings) {
      setQuantityError(t('order.insufficientHoldings'));
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
    if (!quantity || parsedQty <= 0) return;
    if (isConditional && (!triggerPrice || parseFloat(triggerPrice) <= 0)) return;
    if (insufficientHoldings || noHoldings) return;

    // 가격을 USD로 변환하여 백엔드에 전송 (Convert price to USD for backend)
    const usdLimitPrice = toUsdPrice(parseFloat(price), symbol, currencyMode, rate);
    const usdTriggerPrice = toUsdPrice(parseFloat(triggerPrice || '0'), symbol, currencyMode, rate);

    try {
      await placeOrder.mutateAsync({
        symbol,
        side,
        type: isConditional ? 'MARKET' : orderType as 'MARKET' | 'LIMIT',
        quantity: parsedQty,
        ...(orderType === 'LIMIT' ? { price: usdLimitPrice } : {}),
        ...(isConditional
          ? {
              triggerPrice: usdTriggerPrice,
              triggerType: orderType as 'STOP_LOSS' | 'TAKE_PROFIT',
            }
          : {}),
      });
      setQuantity('');
      setTriggerPrice('');
      onSuccess?.();
    } catch {
      // 에러 토스트는 QueryProvider의 전역 MutationCache.onError에서 처리
      // Error toast handled by global MutationCache.onError in QueryProvider
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
            label={`${t('order.price')} (${currencyLabel})`}
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
          label={`${t('order.triggerPrice')} (${currencyLabel})`}
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
            {Number.isFinite(estimatedTotal) && estimatedTotal > 0 ? fp(estimatedTotal) : fp(0)}
          </span>
        </div>
        {portfolio && (
          <div className="flex justify-between text-[13px]">
            <span className="text-text-quaternary">{t('order.available')}</span>
            <span className="text-text-tertiary tabular-nums">
              {isBuy
                ? fp(portfolio.cashBalance)
                : `${holdingQty.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${symbol.replace('USDT', '')}`
              }
            </span>
          </div>
        )}
        {/* 매도 시 보유 가치 표시 (Show holding value for sell) */}
        {!isBuy && portfolio && holdingQty > 0 && (
          <div className="flex justify-between text-[13px]">
            <span className="text-text-quaternary">{t('order.holdingValue')}</span>
            <span className="text-text-tertiary tabular-nums">
              {fp(holdingValue)}
            </span>
          </div>
        )}
        {/* 매도 시 보유량 부족 경고 (Insufficient holdings warning for sell) */}
        {insufficientHoldings && (
          <p className="text-[11px] text-danger mt-1">{t('order.insufficientHoldings')}</p>
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
          parsedQty <= 0 ||
          (isConditional && (!triggerPrice || parseFloat(triggerPrice) <= 0)) ||
          insufficientHoldings ||
          noHoldings
        }
      >
        {placeOrder.isPending
          ? t('order.submitting')
          : noHoldings && !isBuy
            ? t('order.noHoldings')
            : isBuy
              ? `${fp(safeCurrentPrice)} ${t('detail.buy')}`
              : `${fp(safeCurrentPrice)} ${t('detail.sell')}`}
      </Button>
    </div>
  );
}
