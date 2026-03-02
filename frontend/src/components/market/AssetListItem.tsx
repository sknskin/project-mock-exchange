/**
 * @file 자산 목록 아이템
 * @description 개별 종목의 이름, 현재가, 등락률을 표시하는 리스트 아이템
 *
 * @file Asset List Item
 * @description List item displaying asset name, current price, and change rate
 */
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn, formatPriceDisplay, formatPercent, formatAmountDisplay, formatVolumeDisplay } from '@/lib/format';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useTranslation } from '@/hooks/useTranslation';
import { Star } from 'lucide-react';
import type { Asset } from '@/types';

interface AssetListItemProps {
  asset: Asset;
  rank: number;
  isWatchlisted?: boolean;
  onToggleWatchlist?: (symbol: string) => void;
}

function getSymbolColor(symbol: string): string {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500',
    'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
    'bg-rose-500', 'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function AssetListItem({ asset, rank, isWatchlisted, onToggleWatchlist }: AssetListItemProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const isRise = asset.changePercent > 0;
  const isFall = asset.changePercent < 0;
  const isExtreme = Math.abs(asset.changePercent) >= 5;

  const { display } = useCurrencyDisplay();
  const { data: rateData } = useExchangeRate();
  const rate = rateData?.rate;

  const prevPriceRef = useRef(asset.currentPrice);
  const [flashClass, setFlashClass] = useState('');

  useEffect(() => {
    if (prevPriceRef.current !== asset.currentPrice) {
      const cls = asset.currentPrice > prevPriceRef.current ? 'tick-flash-rise' : 'tick-flash-fall';
      setFlashClass(cls);
      prevPriceRef.current = asset.currentPrice;
      const timer = setTimeout(() => setFlashClass(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [asset.currentPrice]);

  return (
    <a
      href={`/asset/${asset.symbol}`}
      onClick={(e) => {
        e.preventDefault();
        router.push(`/asset/${asset.symbol}`);
      }}
      className="flex items-center h-[56px] hover:bg-bg-secondary/60 transition-colors rounded-lg -mx-3 px-3 cursor-pointer"
    >
      {/* 순위 / Rank */}
      <span className="w-6 sm:w-8 text-center text-[13px] text-text-quaternary tabular-nums shrink-0 mr-1 sm:mr-1.5">
        {rank}
      </span>

      {/* 관심종목 / Watchlist Star */}
      {onToggleWatchlist && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleWatchlist(asset.symbol);
          }}
          className="shrink-0 mr-1 sm:mr-2 p-2 -m-1.5 rounded transition-colors hover:bg-bg-secondary/80"
          aria-label={isWatchlisted ? t('market.removeFromWatchlist') : t('market.addToWatchlist')}
        >
          <Star
            className={cn(
              'w-4 h-4 transition-colors',
              isWatchlisted ? 'text-yellow-400 fill-yellow-400' : 'text-text-quaternary',
            )}
          />
        </button>
      )}

      {/* 아이콘 + 이름 + 심볼 / Icon + Name + Symbol */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-[120px] sm:w-[160px] md:w-[180px] lg:w-[200px] shrink-0">
        <div
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0',
            getSymbolColor(asset.symbol),
          )}
          aria-label={asset.symbol}
        >
          {asset.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-text-primary text-[14px] truncate leading-tight">
            {asset.name}
          </div>
          <div className="text-[11px] text-text-quaternary mt-0.5">
            {asset.symbol}
          </div>
        </div>
      </div>

      {/* 여백 / Spacer */}
      <div className="flex-1 min-w-2" />

      {/* 현재가 / Price */}
      <span className={cn('w-[80px] sm:w-[100px] lg:w-[120px] text-right text-[13px] md:text-[14px] font-semibold text-text-primary tabular-nums shrink-0 truncate', flashClass)}>
        {formatPriceDisplay(asset.currentPrice, asset.symbol, display, rate)}
      </span>

      {/* 변동 금액 / Change amount */}
      <span
        className={cn(
          'w-[80px] md:w-[90px] lg:w-[100px] text-right text-[12px] md:text-[13px] font-medium tabular-nums hidden sm:block shrink-0 truncate',
          isRise && 'text-rise',
          isFall && 'text-fall',
          !isRise && !isFall && 'text-text-quaternary',
        )}
      >
        {formatAmountDisplay(asset.changeAmount ?? 0, asset.symbol, display, rate)}
      </span>

      {/* 변동률 / Change percent */}
      <div className="w-[60px] sm:w-[72px] lg:w-[84px] flex justify-end shrink-0">
        {isExtreme ? (
          <span
            className={cn(
              'text-[13px] font-semibold tabular-nums px-2 py-0.5 rounded',
              isRise ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall',
            )}
          >
            {formatPercent(asset.changePercent)}
          </span>
        ) : (
          <span
            className={cn(
              'text-[13px] font-medium tabular-nums',
              isRise && 'text-rise',
              isFall && 'text-fall',
              !isRise && !isFall && 'text-text-quaternary',
            )}
          >
            {formatPercent(asset.changePercent)}
          </span>
        )}
      </div>

      {/* 24시간 최고가 / 24h High */}
      <span className="w-[90px] text-right text-[13px] text-text-secondary tabular-nums hidden xl:block shrink-0">
        {formatPriceDisplay(asset.high24h ?? 0, asset.symbol, display, rate)}
      </span>

      {/* 24시간 최저가 / 24h Low */}
      <span className="w-[90px] text-right text-[13px] text-text-secondary tabular-nums hidden xl:block shrink-0">
        {formatPriceDisplay(asset.low24h ?? 0, asset.symbol, display, rate)}
      </span>

      {/* 거래대금 / Volume */}
      <span className="w-[80px] lg:w-[90px] text-right text-[13px] text-text-tertiary tabular-nums hidden md:block shrink-0">
        {formatVolumeDisplay((asset.currentPrice * (asset.volume ?? 0)), asset.symbol, display, rate)}
      </span>
    </a>
  );
}

export default React.memo(AssetListItem);
