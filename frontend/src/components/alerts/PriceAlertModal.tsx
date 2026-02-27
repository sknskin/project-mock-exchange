/**
 * @file 가격 알림 모달
 * @description 가격 알림 생성/관리 모달
 *
 * @file Price Alert Modal
 * @description Modal for creating and managing price alerts
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Bell, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { usePriceAlerts, useCreatePriceAlert, useDeletePriceAlert } from '@/hooks/usePriceAlert';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useToastStore } from '@/stores/toast';
import { cn, isKRW, formatPriceDisplay } from '@/lib/format';

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
}

export default function PriceAlertModal({ isOpen, onClose, symbol, currentPrice }: PriceAlertModalProps) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);
  const { data: alerts } = usePriceAlerts(symbol);
  const createAlert = useCreatePriceAlert();
  const deleteAlert = useDeletePriceAlert();
  const { data: rateData } = useExchangeRate();
  const currencyMode = useCurrencyDisplay((s) => s.display);
  const rate = rateData?.rate;

  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [targetPrice, setTargetPrice] = useState('');
  const userTouched = useRef(false);

  // 표시 통화에 맞게 가격 변환 (Convert price to display currency)
  const toDisplayPrice = useCallback((basePrice: number): number => {
    const wantKRW = currencyMode === 'krw';
    if (isKRW(symbol)) {
      return (!wantKRW && rate) ? basePrice / rate : basePrice;
    }
    return (wantKRW && rate) ? basePrice * rate : basePrice;
  }, [currencyMode, rate, symbol]);

  // 표시 통화에서 기본 통화로 역변환 (Convert display currency back to base)
  const toBasePrice = useCallback((displayPrice: number): number => {
    const wantKRW = currencyMode === 'krw';
    if (isKRW(symbol)) {
      return (!wantKRW && rate) ? displayPrice * rate : displayPrice;
    }
    return (wantKRW && rate) ? displayPrice / rate : displayPrice;
  }, [currencyMode, rate, symbol]);

  // 통화 접두사 (Currency prefix)
  const currencyPrefix = (() => {
    const wantKRW = currencyMode === 'krw';
    if (isKRW(symbol)) return wantKRW ? '₩' : '$';
    return wantKRW ? '₩' : '$';
  })();

  // ESC 키로 닫기 / Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 모달이 열릴 때 입력 상태 초기화 (Reset touch state when modal opens)
  useEffect(() => {
    if (isOpen) {
      userTouched.current = false;
    }
  }, [isOpen]);

  // 사용자가 입력하지 않은 경우에만 틱마다 가격 업데이트 (Update price on tick only if user hasn't started editing)
  useEffect(() => {
    if (isOpen && currentPrice > 0 && !userTouched.current) {
      const displayed = toDisplayPrice(currentPrice);
      setTargetPrice(currencyPrefix === '₩' ? Math.round(displayed).toString() : displayed.toFixed(2));
    }
  }, [isOpen, currentPrice, toDisplayPrice, currencyPrefix]);

  if (!isOpen) return null;

  const handleCreate = () => {
    const displayedPrice = parseFloat(targetPrice);
    if (!displayedPrice || displayedPrice <= 0) return;

    const currentDisplayed = toDisplayPrice(currentPrice);
    if (condition === 'ABOVE' && displayedPrice <= currentDisplayed) {
      useToastStore.getState().addToast(t('alert.invalidAbove'), 'error');
      return;
    }
    if (condition === 'BELOW' && displayedPrice >= currentDisplayed) {
      useToastStore.getState().addToast(t('alert.invalidBelow'), 'error');
      return;
    }

    const basePrice = toBasePrice(displayedPrice);
    const currency = currencyPrefix === '₩' ? 'KRW' : 'USD';
    createAlert.mutate({ symbol, targetPrice: basePrice, condition, currency, displayTargetPrice: displayedPrice }, {
      onSuccess: () => {
        userTouched.current = false;
        const displayed = toDisplayPrice(currentPrice);
        setTargetPrice(currencyPrefix === '₩' ? Math.round(displayed).toString() : displayed.toFixed(2));
      },
    });
  };

  const formatAlertPrice = (basePrice: string | number) => {
    return formatPriceDisplay(Number(basePrice), symbol, currencyMode, rate);
  };

  const activeAlerts = alerts?.filter((a) => a.isActive) ?? [];
  const triggeredAlerts = alerts?.filter((a) => !a.isActive) ?? [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="price-alert-modal-title" ref={modalRef}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-bg-primary border border-border rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-accent" />
            <h2 id="price-alert-modal-title" className="text-[15px] font-bold text-text-primary">{t('alert.title')}</h2>
            <span className="text-[12px] text-text-tertiary">{symbol}</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-bg-secondary transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        {/* Create Form */}
        <div className="px-5 py-4 border-b border-border space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setCondition('ABOVE')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[13px] font-semibold transition-colors',
                condition === 'ABOVE'
                  ? 'bg-rise/15 text-rise border border-rise/30'
                  : 'bg-bg-secondary text-text-tertiary border border-transparent',
              )}
            >
              <ArrowUp className="w-3.5 h-3.5" />
              {t('alert.above')}
            </button>
            <button
              onClick={() => setCondition('BELOW')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[13px] font-semibold transition-colors',
                condition === 'BELOW'
                  ? 'bg-fall/15 text-fall border border-fall/30'
                  : 'bg-bg-secondary text-text-tertiary border border-transparent',
              )}
            >
              <ArrowDown className="w-3.5 h-3.5" />
              {t('alert.below')}
            </button>
          </div>

          <div>
            <label className="text-[12px] text-text-tertiary mb-1 block">{t('alert.targetPrice')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-tertiary">{currencyPrefix}</span>
              <input
                type="number"
                step="any"
                value={targetPrice}
                onChange={(e) => { userTouched.current = true; setTargetPrice(e.target.value); }}
                className="w-full h-10 pl-7 pr-3 bg-bg-secondary border border-border rounded-lg text-[14px] text-text-primary tabular-nums focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={createAlert.isPending || !targetPrice}
            className="w-full h-10 bg-accent text-white text-[13px] font-bold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {t('alert.create')}
          </button>
        </div>

        {/* Active Alerts */}
        <div className="max-h-48 overflow-y-auto">
          {activeAlerts.length === 0 && triggeredAlerts.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-text-quaternary">
              {t('alert.noAlerts')}
            </div>
          ) : (
            <div className="py-2">
              {activeAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between px-5 py-2 hover:bg-bg-secondary/50">
                  <div className="flex items-center gap-2">
                    {alert.condition === 'ABOVE' ? (
                      <ArrowUp className="w-3.5 h-3.5 text-rise" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-fall" />
                    )}
                    <span className="text-[13px] font-semibold text-text-primary tabular-nums">
                      {formatAlertPrice(alert.targetPrice)}
                    </span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                      {t('alert.active')}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteAlert.mutate(alert.id)}
                    className="p-1.5 rounded-lg hover:bg-bg-secondary transition-colors text-text-quaternary hover:text-fall"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {triggeredAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between px-5 py-2 opacity-50">
                  <div className="flex items-center gap-2">
                    {alert.condition === 'ABOVE' ? (
                      <ArrowUp className="w-3.5 h-3.5 text-text-quaternary" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-text-quaternary" />
                    )}
                    <span className="text-[13px] text-text-tertiary tabular-nums line-through">
                      {formatAlertPrice(alert.targetPrice)}
                    </span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-bg-secondary text-text-quaternary font-medium">
                      {t('alert.triggered')}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteAlert.mutate(alert.id)}
                    className="p-1.5 rounded-lg hover:bg-bg-secondary transition-colors text-text-quaternary hover:text-fall"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
