/**
 * @file 가격 표시 컴포넌트
 * @description 가격과 등락률을 색상 구분하여 표시합니다
 *
 * @file Price Display Component
 * @description Displays price and change rate with color-coded indicators
 */
'use client';

import { cn, formatPrice, formatPercent } from '@/lib/format';

// 가격 표시 Props / Price Display Props
interface PriceDisplayProps {
  /** 표시할 가격 / Price to display */
  price: number;
  /** 등락률 (%) / Change rate (%) */
  changePercent: number;
  /** 텍스트 크기 / Text size */
  size?: 'sm' | 'md' | 'lg';
}

export default function PriceDisplay({
  price,
  changePercent,
  size = 'md',
}: PriceDisplayProps) {
  // 상승/하락 판단 (색상 분기용) / Determine rise/fall (for color branching)
  const isRise = changePercent > 0;
  const isFall = changePercent < 0;

  // 크기별 가격 텍스트 사이즈 / Price text size per variant
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
