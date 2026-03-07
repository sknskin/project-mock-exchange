/**
 * @file 주문 폼 컴포넌트
 * @description 시장가/지정가/손절/익절 매수/매도 주문을 입력하는 폼
 *
 * @file Order Form Component
 * @description Form for entering market/limit/stop-loss/take-profit buy/sell orders
 */
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import InlineTooltip from '@/components/ui/InlineTooltip';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { usePlaceOrder } from '@/hooks/useOrders';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import { formatPriceDisplay, isKRW } from '@/lib/format';
import type { TranslationKey } from '@/lib/i18n';

// 주문 폼 Props / Order Form Props
interface OrderFormProps {
  /** 종목 심볼 / Asset symbol */
  symbol: string;
  /** 현재 가격 (USD) / Current price (USD) */
  currentPrice: number;
  /** 매수/매도 방향 / Buy/Sell side */
  side: 'BUY' | 'SELL';
  /** 주문 성공 콜백 / Order success callback */
  onSuccess?: () => void;
}

type OrderFormType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';

const typeTabKeys: { key: string; i18nKey: TranslationKey; tooltipKey: TranslationKey }[] = [
  { key: 'MARKET', i18nKey: 'order.market', tooltipKey: 'order.marketTooltip' },
  { key: 'LIMIT', i18nKey: 'order.limit', tooltipKey: 'order.limitTooltip' },
  { key: 'STOP_LOSS', i18nKey: 'order.stopLoss', tooltipKey: 'order.stopLossTooltip' },
  { key: 'TAKE_PROFIT', i18nKey: 'order.takeProfit', tooltipKey: 'order.takeProfitTooltip' },
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
  const { query: { data: rateData } } = useExchangeRate();
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  // currentPrice 또는 통화 모드 변경 시 지정가 갱신 (Sync limit price with currentPrice/currency)
  useEffect(() => {
    const safePrice = Number.isFinite(currentPrice) ? currentPrice : 0;
    if (safePrice > 0) {
      const displayPrice = toDisplayPrice(safePrice, symbol, currencyMode, rate);
      setPrice(displayPrice.toString());
    }
  }, [currentPrice, symbol, currencyMode, rate]);

  // 통화 모드 변경 시 트리거 가격도 동기화 (Sync triggerPrice when currency mode changes)
  const [prevCurrencyMode, setPrevCurrencyMode] = useState(currencyMode);
  const [prevRate, setPrevRate] = useState(rate);
  useEffect(() => {
    if (triggerPrice && (prevCurrencyMode !== currencyMode || prevRate !== rate)) {
      const parsedTrigger = parseFloat(triggerPrice);
      if (parsedTrigger > 0 && Number.isFinite(parsedTrigger)) {
        const usdValue = toUsdPrice(parsedTrigger, symbol, prevCurrencyMode, prevRate);
        const newDisplay = toDisplayPrice(usdValue, symbol, currencyMode, rate);
        setTriggerPrice(newDisplay.toString());
      }
    }
    setPrevCurrencyMode(currencyMode);
    setPrevRate(rate);
  }, [currencyMode, rate, symbol, triggerPrice, prevCurrencyMode, prevRate]);

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

  // 예상 금액 — USD 기준으로 계산, fp()가 통화 변환 담당 (Calculate in USD, let fp() handle display conversion)
  const displayCurrentPrice = toDisplayPrice(safeCurrentPrice, symbol, currencyMode, rate);
  const estimatedTotalUsd = isConditional
    ? parsedQty * toUsdPrice(parseFloat(triggerPrice || '0'), symbol, currencyMode, rate)
    : orderType === 'MARKET'
      ? parsedQty * safeCurrentPrice
      : parsedQty * toUsdPrice(parseFloat(price || '0'), symbol, currencyMode, rate);

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

  const handleRequestSubmit = () => {
    if (!quantity || parsedQty <= 0) return;
    if (isConditional && (!triggerPrice || parseFloat(triggerPrice) <= 0)) return;
    if (insufficientHoldings || noHoldings) return;
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);

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

      {/* 주문 유형 설명 + 인라인 툴팁 / Order type description + inline tooltip */}
      <div className="flex items-center gap-1">
        <p className="text-[11px] text-text-quaternary leading-relaxed">
          {orderType === 'STOP_LOSS'
            ? t('order.stopLossDesc')
            : orderType === 'TAKE_PROFIT'
              ? t('order.takeProfitDesc')
              : t(`order.${orderType === 'MARKET' ? 'market' : 'limit'}Tooltip` as TranslationKey)}
        </p>
        <InlineTooltip
          text={t(typeTabKeys.find((tab) => tab.key === orderType)!.tooltipKey)}
        />
      </div>

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
        {/* 비율 수량 선택기 / Percentage quantity selector */}
        <div className="flex gap-1.5 mt-2">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => {
                if (isBuy && portfolio && safeCurrentPrice > 0) {
                  const maxQty = portfolio.cashBalance / safeCurrentPrice;
                  setQuantity((maxQty * pct / 100).toFixed(8).replace(/\.?0+$/, ''));
                } else if (!isBuy && holdingQty > 0) {
                  setQuantity((holdingQty * pct / 100).toFixed(8).replace(/\.?0+$/, ''));
                }
                setQuantityError('');
              }}
              className="flex-1 py-1.5 text-[11px] font-medium text-text-tertiary bg-bg-secondary rounded-md hover:bg-bg-tertiary hover:text-text-primary transition-colors"
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5 py-3">
        <div className="flex justify-between text-[14px]">
          <span className="text-text-tertiary">{t('order.estimatedTotal')}</span>
          <span className="text-text-primary font-bold tabular-nums">
            {Number.isFinite(estimatedTotalUsd) && estimatedTotalUsd > 0 ? fp(estimatedTotalUsd) : fp(0)}
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
        onClick={handleRequestSubmit}
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

      {/* 주문 확인 다이얼로그 / Order Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSubmit}
        title={isBuy ? t('detail.buy') : t('detail.sell')}
        message={`${symbol} ${parsedQty} ${t('order.quantity')}\n${orderType === 'MARKET' ? t('order.market') : `${t('order.price')}: ${fp(toUsdPrice(parseFloat(price || '0'), symbol, currencyMode, rate))}`}\n${t('order.estimatedTotal')}: ${Number.isFinite(estimatedTotalUsd) && estimatedTotalUsd > 0 ? fp(estimatedTotalUsd) : fp(0)}`}
        confirmVariant={isBuy ? 'primary' : 'danger'}
        loading={placeOrder.isPending}
      />
    </div>
  );
}
