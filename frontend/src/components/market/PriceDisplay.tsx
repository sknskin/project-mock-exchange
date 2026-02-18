'use client';

import { cn, formatPrice, formatPercent } from '@/lib/format';

interface PriceDisplayProps {
  price: number;
  changePercent: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function PriceDisplay({
  price,
  changePercent,
  size = 'md',
}: PriceDisplayProps) {
  const isRise = changePercent > 0;
  const isFall = changePercent < 0;

  const priceSize = {
    sm: 'text-[15px]',
    md: 'text-[16px]',
    lg: 'text-[28px]',
  };

  const changeSize = {
    sm: 'text-[12px]',
    md: 'text-[13px]',
    lg: 'text-[15px]',
  };

  return (
    <div className="text-right">
      <div
        className={cn(
          'font-bold tabular-nums',
          priceSize[size],
          'text-text-primary',
        )}
      >
        {formatPrice(price)}
      </div>
      <div
        className={cn(
          'tabular-nums mt-0.5 font-semibold',
          changeSize[size],
          isRise && 'text-rise',
          isFall && 'text-fall',
          !isRise && !isFall && 'text-text-quaternary',
        )}
      >
        {formatPercent(changePercent)}
      </div>
    </div>
  );
}
