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
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
  };

  const changeSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="text-right">
      <div
        className={cn(
          'font-semibold tabular-nums',
          priceSize[size],
          isRise && 'text-rise',
          isFall && 'text-fall',
          !isRise && !isFall && 'text-text-primary',
        )}
      >
        {formatPrice(price)}
      </div>
      <div
        className={cn(
          'tabular-nums',
          changeSize[size],
          isRise && 'text-rise',
          isFall && 'text-fall',
          !isRise && !isFall && 'text-text-secondary',
        )}
      >
        {formatPercent(changePercent)}
      </div>
    </div>
  );
}
