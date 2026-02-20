'use client';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { cn } from '@/lib/format';

export default function ExchangeRateBar() {
  const { data, refetch, isFetching } = useExchangeRate();
  const { display, toggle } = useCurrencyDisplay();
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

  return (
    <div className="flex items-center justify-between py-2.5 px-1 border-b border-border text-[12px]">
      <div className="flex items-center gap-3">
        <span className="text-text-quaternary font-medium shrink-0">USD/KRW</span>
        <span className="text-text-primary font-bold tabular-nums">
          {data.rate.toLocaleString('ko-KR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          원
        </span>
        <button
          onClick={toggle}
          className={cn(
            'px-2 py-0.5 rounded text-[11px] font-semibold transition-colors border',
            display === 'krw'
              ? 'bg-accent/10 text-accent border-accent/30'
              : 'bg-bg-tertiary/50 text-text-tertiary border-border hover:text-text-secondary',
          )}
        >
          {display === 'original' ? '$ → ₩' : '₩ → $'}
        </button>
      </div>
      <div className="flex items-center gap-2 text-text-quaternary">
        <span className="tabular-nums">{timeStr}</span>
        <button
          onClick={() => refetch()}
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
    </div>
  );
}
