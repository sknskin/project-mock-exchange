/**
 * @file 환율 정보 바 컴포넌트
 * @description USD/KRW 환율과 통화 표시 전환 기능을 제공하는 컴포넌트
 *
 * @file Exchange Rate Bar Component
 * @description Component displaying USD/KRW exchange rate with currency toggle
 */
'use client';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';

export default function ExchangeRateBar() {
  const { query, manualRefetch } = useExchangeRate();
  const { data, isFetching } = query;
  const { display, toggle } = useCurrencyDisplay();
  const { t } = useTranslation();
  if (!data) {
    return (
      <div className="flex items-center justify-between py-2.5 px-1 border-b border-border text-[12px]">
        <div className="flex items-center gap-3">
          <span className="text-text-quaternary font-medium shrink-0">USD/KRW</span>
          <span className="text-text-quaternary tabular-nums">---</span>
        </div>
      </div>
    );
  }

  const timeStr = data.updatedAt.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const isKRWMode = display === 'krw';

  return (
    <div className="flex flex-wrap items-center justify-between gap-y-1 py-2.5 px-1 border-b border-border text-[12px]">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-text-quaternary font-medium shrink-0">USD/KRW</span>
        <span className="text-text-primary font-bold tabular-nums whitespace-nowrap">
          {data.rate.toLocaleString('ko-KR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          {' '}{t('exchange.unit')}
        </span>
        <button
          onClick={toggle}
          className="px-2 py-0.5 rounded text-[11px] font-semibold transition-colors border bg-bg-tertiary/50 text-text-tertiary border-border hover:text-text-secondary whitespace-nowrap"
        >
          {isKRWMode ? '₩ → $' : '$ → ₩'}
        </button>
        <span className="text-[10px] text-text-quaternary hidden sm:inline whitespace-nowrap">
          {isKRWMode ? t('exchange.showingKRW') : t('exchange.showingUSD')}
        </span>
      </div>
      <div className="flex flex-col items-end gap-0.5 text-text-quaternary">
        <div className="flex items-center gap-2">
          <span className="tabular-nums text-[11px] sm:text-[12px]">{timeStr}</span>
          <button
            onClick={() => manualRefetch()}
            disabled={isFetching}
            className="p-1 hover:text-accent transition-colors disabled:opacity-40"
          >
            <svg
              className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M20.015 4.356v4.992"
              />
            </svg>
          </button>
        </div>
        <span className="text-[9px] text-text-quaternary/60 hidden sm:block">{t('exchange.rateNote')}</span>
      </div>
    </div>
  );
}
