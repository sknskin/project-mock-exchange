/**
 * @file 주문 폼 컴포넌트
 * @description 시장가/지정가/손절/익절 매수/매도 주문을 입력하는 폼
 *
 * @file Order Form Component
 * @description Form for entering market/limit/stop-loss/take-profit buy/sell orders
 */
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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

// VAL-M-02: 종목 유형별 최대 소수점 자릿수 / Max decimal places by asset type
const MAX_DECIMALS_CRYPTO = 8;
const MAX_DECIMALS_STOCK_US = 2;
const MAX_DECIMALS_STOCK_KR = 0;

/** 심볼 기반 최대 소수점 자릿수 반환
 * Return max decimal places based on symbol type */
function getMaxDecimals(symbol: string): number {
  if (symbol.endsWith('.KS')) return MAX_DECIMALS_STOCK_KR;
  if (symbol.includes('-') || symbol.endsWith('USDT')) return MAX_DECIMALS_CRYPTO;
  return MAX_DECIMALS_STOCK_US;
}

/** 소수점 자릿수 초과 여부 검사
 * Check if value exceeds max decimal places */
function exceedsDecimals(value: string, maxDecimals: number): boolean {
  const parts = value.split('.');
  if (parts.length < 2) return false;
  return parts[1].length > maxDecimals;
}

// 주문 폼 Props / Order Form Props
interface OrderFormProps {
  /** 종목 심볼
   * Asset symbol */
  symbol: string;
  /** 현재 가격 (USD)
   * Current price (USD) */
  currentPrice: number;
  /** 매수/매도 방향
   * Buy/Sell side */
  side: 'BUY' | 'SELL';
  /** 주문 성공 콜백
   * Order success callback */
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
  if (isKRW(symbol)) {
    // KRW 종목: 백엔드 가격이 KRW 기준, USD 표시 시 환율로 나눔
    // KRW symbol: backend price is in KRW, divide by rate for USD display
    if (!wantKRW && rate && rate > 0) return usdPrice / rate;
    return usdPrice;
  }
  // USD 종목: KRW 표시 시 환율로 곱함
  // USD symbol: multiply by rate for KRW display
  if (wantKRW && rate) return Math.round(usdPrice * rate);
  return usdPrice;
}

/** 입력된 가격을 USD(백엔드 기준)로 변환 (Input price → USD for backend) */
function toUsdPrice(inputPrice: number, symbol: string, currencyMode: 'krw' | 'original', rate?: number): number {
  if (!Number.isFinite(inputPrice)) return 0;
  const wantKRW = currencyMode === 'krw';
  if (isKRW(symbol)) {
    // KRW 종목: USD 모드에서 입력된 값을 환율로 곱해 KRW(백엔드)로 변환
    // KRW symbol: multiply USD input by rate to convert back to KRW (backend)
    if (!wantKRW && rate && rate > 0) return Math.round(inputPrice * rate);
    return inputPrice;
  }
  // USD 종목: KRW 모드에서 입력된 값을 환율로 나눠 USD(백엔드)로 변환
  // USD symbol: divide KRW input by rate to convert back to USD (backend)
  if (wantKRW && rate && rate > 0) return inputPrice / rate;
  return inputPrice;
}

/** 주문 폼 — 시장가/지정가/손절/익절 매수·매도 주문 입력
 * Order form — market/limit/stop-loss/take-profit buy/sell input */
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
  const [triggerPriceError, setTriggerPriceError] = useState('');
  const placeOrder = usePlaceOrder();
  const { data: portfolio } = usePortfolio();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // PF-M-02: price + triggerPrice 업데이트를 단일 useEffect로 병합하여 캐스케이딩 렌더 방지
  // PF-M-02: Merge price + triggerPrice updates into a single useEffect to avoid cascading re-renders
  const prevCurrencyModeRef = useRef(currencyMode);
  const prevRateRef = useRef(rate);
  useEffect(() => {
    const prevMode = prevCurrencyModeRef.current;
    const prevR = prevRateRef.current;

    // 지정가 갱신 (Sync limit price with currentPrice/currency)
    const safePrice = Number.isFinite(currentPrice) ? currentPrice : 0;
    if (safePrice > 0) {
      const displayPrice = toDisplayPrice(safePrice, symbol, currencyMode, rate);
      setPrice(displayPrice.toString());
    }

    // 통화 모드 변경 시 트리거 가격도 동기화 (Sync triggerPrice when currency mode changes)
    if (triggerPrice && (prevMode !== currencyMode || prevR !== rate)) {
      const parsedTrigger = parseFloat(triggerPrice);
      if (parsedTrigger > 0 && Number.isFinite(parsedTrigger)) {
        const usdValue = toUsdPrice(parsedTrigger, symbol, prevMode, prevR);
        const newDisplay = toDisplayPrice(usdValue, symbol, currencyMode, rate);
        setTriggerPrice(newDisplay.toString());
      }
    }

    prevCurrencyModeRef.current = currencyMode;
    prevRateRef.current = rate;
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

  // 예상 금액 — USD 기준으로 계산, fp()가 통화 변환 담당 (Calculate in USD, let fp() handle display conversion)
  const estimatedTotalUsd = isConditional
    ? parsedQty * toUsdPrice(parseFloat(triggerPrice || '0'), symbol, currencyMode, rate)
    : orderType === 'MARKET'
      ? parsedQty * safeCurrentPrice
      : parsedQty * toUsdPrice(parseFloat(price || '0'), symbol, currencyMode, rate);

  const fp = (p: number) => formatPriceDisplay(p, symbol, currencyMode, rate);
  const currencyLabel = isKRW(symbol) ? 'KRW' : currencyMode === 'krw' ? 'KRW' : 'USD';

  // VAL-M-02: 현재 심볼의 최대 소수점 자릿수 / Max decimals for current symbol
  const maxDecimals = getMaxDecimals(symbol);

  /** 수량 유효성 검사
   * Validate order quantity */
  const validateQuantity = () => {
    if (quantity && parsedQty <= 0) {
      setQuantityError(t('order.quantityPlaceholder'));
    } else if (insufficientHoldings) {
      setQuantityError(t('order.insufficientHoldings'));
    // VAL-M-02: 소수점 자릿수 초과 검증 / Decimal places exceeded validation
    } else if (quantity && exceedsDecimals(quantity, maxDecimals)) {
      setQuantityError(`Max ${maxDecimals} decimal places`);
    } else {
      setQuantityError('');
    }
  };

  /** 가격 유효성 검사
   * Validate order price */
  const validatePrice = () => {
    if (price && parseFloat(price) <= 0) {
      setPriceError(t('order.pricePlaceholder'));
    // VAL-M-02: 가격 소수점 자릿수 검증 / Price decimal places validation
    } else if (price && exceedsDecimals(price, maxDecimals)) {
      setPriceError(`Max ${maxDecimals} decimal places`);
    } else {
      setPriceError('');
    }
  };

  /** 트리거 가격 유효성 검사
   * Validate trigger price */
  const validateTriggerPrice = () => {
    if (triggerPrice && parseFloat(triggerPrice) <= 0) {
      setTriggerPriceError(t('order.triggerPricePlaceholder'));
    } else {
      setTriggerPriceError('');
    }
  };

  /** 주문 확인 모달 열기
   * Open order confirmation modal */
  const handleRequestSubmit = () => {
    if (!quantity || parsedQty <= 0) return;
    if (isConditional && (!triggerPrice || parseFloat(triggerPrice) <= 0)) return;
    if (insufficientHoldings || noHoldings) return;
    setConfirmOpen(true);
  };

  /** 주문 최종 제출 처리
   * Handle final order submission */
  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);

    const usdLimitPrice = toUsdPrice(parseFloat(price), symbol, currencyMode, rate);
    const usdTriggerPrice = toUsdPrice(parseFloat(triggerPrice || '0'), symbol, currencyMode, rate);

    // 수량·가격 범위 검증 — 비정상 값 서버 전송 방지
    // Bounds check on quantity/price — prevent submitting unreasonable values to server
    if (parsedQty <= 0 || !Number.isFinite(parsedQty)) return;
    if (orderType === 'LIMIT') {
      if (usdLimitPrice <= 0 || usdLimitPrice >= 1e9 || !Number.isFinite(usdLimitPrice)) return;
    }
    if (isConditional) {
      if (usdTriggerPrice <= 0 || usdTriggerPrice >= 1e9 || !Number.isFinite(usdTriggerPrice)) return;
    }

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
    <div className="space-y-4 sm:space-y-5">
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
            onChange={(e) => {
              const val = e.target.value;
              // VAL-M-02: 가격 소수점 자릿수 제한 / Enforce price decimal places
              if (val && exceedsDecimals(val, maxDecimals)) return;
              setPrice(val);
              setPriceError('');
            }}
            onBlur={validatePrice}
            placeholder={t('order.pricePlaceholder')}
            aria-describedby={priceError ? 'price-error' : undefined}
          />
          {priceError && <p id="price-error" className="text-[11px] text-danger mt-1">{priceError}</p>}
        </div>
      )}

      {isConditional && (
        <div>
          <Input
            label={`${t('order.triggerPrice')} (${currencyLabel})`}
            type="number"
            value={triggerPrice}
            onChange={(e) => { setTriggerPrice(e.target.value); setTriggerPriceError(''); }}
            onBlur={validateTriggerPrice}
            placeholder={t('order.triggerPricePlaceholder')}
            aria-describedby={triggerPriceError ? 'trigger-price-error' : undefined}
          />
          {triggerPriceError && <p id="trigger-price-error" className="text-[11px] text-danger mt-1">{triggerPriceError}</p>}
        </div>
      )}

      <div>
        <Input
          label={t('order.quantity')}
          type="number"
          value={quantity}
          onChange={(e) => {
            const val = e.target.value;
            // VAL-M-02: 소수점 자릿수 제한 적용 / Enforce max decimal places
            if (val && exceedsDecimals(val, maxDecimals)) return;
            setQuantity(val);
            setQuantityError('');
          }}
          onBlur={validateQuantity}
          placeholder={t('order.quantityPlaceholder')}
          aria-describedby={
            [quantityError && 'quantity-error', insufficientHoldings && 'insufficient-holdings-error']
              .filter(Boolean).join(' ') || undefined
          }
        />
        {quantityError && <p id="quantity-error" className="text-[11px] text-danger mt-1">{quantityError}</p>}
        {/* 비율 수량 선택기 / Percentage quantity selector */}
        <div className="flex gap-1.5 mt-2">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => {
                // FE-M-02: 서버 제공 원본 가격(safeCurrentPrice)으로 최대 수량 계산 — 환율 변환 표시가격 대신 사용하여 드리프트 방지
                // FE-M-02: Use server-provided price (safeCurrentPrice) for max qty calc — prevents drift from display currency conversion
                if (isBuy && portfolio && safeCurrentPrice > 0) {
                  // FE-M-02: 환율 오차 버퍼 0.5% 적용 — 환율 변동으로 인한 초과 주문 방지
                  // FE-M-02: Apply 0.5% exchange rate safety buffer — prevents over-ordering due to rate fluctuations
                  const safeMaxQty = Math.floor((portfolio.cashBalance / safeCurrentPrice) * 0.995 * 100) / 100;
                  const factor = pct === 100 ? 0.99 : 1;
                  setQuantity((safeMaxQty * pct / 100 * factor).toFixed(8).replace(/\.?0+$/, ''));
                } else if (!isBuy && holdingQty > 0) {
                  setQuantity((holdingQty * pct / 100).toFixed(8).replace(/\.?0+$/, ''));
                }
                setQuantityError('');
              }}
              // MOB-M-03: 최소 터치 타겟 44px 보장 / Ensure 44px min touch target
              className="flex-1 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-[12px] sm:text-[11px] font-medium text-text-tertiary bg-bg-secondary rounded-md hover:bg-bg-tertiary hover:text-text-primary transition-colors"
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
          <p id="insufficient-holdings-error" className="text-[11px] text-danger mt-1">{t('order.insufficientHoldings')}</p>
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
