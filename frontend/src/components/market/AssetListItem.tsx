/**
 * @file 자산 목록 아이템
 * @description 개별 종목의 이름, 현재가, 등락률을 표시하는 리스트 아이템
 *
 * @file Asset List Item
 * @description List item displaying asset name, current price, and change rate
 */
'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { cn, formatPriceDisplay, formatPercent, formatAmountDisplay, formatVolumeDisplay } from '@/lib/format';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useTranslation } from '@/hooks/useTranslation';
import { useLivePrice } from '@/stores/livePrice';
import { Star } from 'lucide-react';
import type { Asset } from '@/types';

interface AssetListItemProps {
  asset: Asset;
  rank: number;
  isWatchlisted?: boolean;
  onToggleWatchlist?: (symbol: string) => void;
}

/** 심볼 해시 기반 아바타 배경색 결정
 * Determine avatar background color from symbol hash */
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

/** 자산 목록 아이템 — 순위, 가격, 등락률, 거래대금 등 표시
 * Asset list item — displays rank, price, change, volume, etc. */
function AssetListItem({ asset, rank, isWatchlisted, onToggleWatchlist }: AssetListItemProps) {
  const { t } = useTranslation();

  // 실시간 가격을 Zustand 스토어에서 심볼별 구독 — 이 행만 리렌더
  // Subscribe to live price per-symbol from Zustand store — only this row re-renders
  const live = useLivePrice(asset.symbol);
  const displayAsset = useMemo(() => {
    if (!live) return asset;
    return {
      ...asset,
      currentPrice: live.price,
      price: live.price,
      changePercent: live.changePercent ?? asset.changePercent,
      changeAmount: live.changeAmount ?? asset.changeAmount,
      volume: live.volume || asset.volume,
      high24h: live.high24h || asset.high24h,
      low24h: live.low24h || asset.low24h,
    };
  }, [asset, live]);

  const isRise = displayAsset.changePercent > 0;
  const isFall = displayAsset.changePercent < 0;
  const isExtreme = Math.abs(displayAsset.changePercent) >= 5;

  const { display } = useCurrencyDisplay();
  const { query: { data: rateData } } = useExchangeRate();
  const rate = rateData?.rate;

  const prevPriceRef = useRef(displayAsset.currentPrice);
  const [flashClass, setFlashClass] = useState('');

  useEffect(() => {
    if (prevPriceRef.current !== displayAsset.currentPrice) {
      const cls = displayAsset.currentPrice > prevPriceRef.current ? 'tick-flash-rise' : 'tick-flash-fall';
      setFlashClass(cls);
      prevPriceRef.current = displayAsset.currentPrice;
      const timer = setTimeout(() => setFlashClass(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [displayAsset.currentPrice]);

  return (
    <Link
      href={`/asset/${asset.symbol}`}
      className="flex items-center h-[56px] hover:bg-bg-secondary/60 active:bg-bg-secondary/80 transition-colors rounded-lg -mx-3 px-3 cursor-pointer overflow-hidden"
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
          className="shrink-0 mr-1 sm:mr-2 p-2 -m-1.5 rounded transition-colors hover:bg-bg-secondary/80 active:scale-125 transition-transform duration-150"
          aria-label={isWatchlisted ? t('market.removeFromWatchlist') : t('market.addToWatchlist')}
        >
          <Star
            className={cn(
              'w-4 h-4 transition-all duration-150',
              isWatchlisted ? 'text-yellow-400 fill-yellow-400 scale-110' : 'text-text-quaternary scale-100',
            )}
          />
        </button>
      )}

      {/* 아이콘 + 이름 + 심볼 / Icon + Name + Symbol */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-[100px] sm:w-[160px] md:w-[180px] lg:w-[200px] shrink-0">
        <div
          className={cn(
            'w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-white shrink-0',
            getSymbolColor(asset.symbol),
          )}
          aria-label={asset.symbol}
        >
          {asset.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-text-primary text-[13px] sm:text-[14px] truncate leading-tight">
            {asset.name}
          </div>
          <div className="text-[10px] sm:text-[11px] text-text-quaternary mt-0.5 truncate">
            {asset.symbol}
          </div>
        </div>
      </div>

      {/* 여백 / Spacer */}
      <div className="flex-1 min-w-2" />

      {/* 현재가 / Price */}
      {/* 현재가 — 단순 텍스트 렌더 (AnimatedNumber 제거로 성능 대폭 개선)
           Price — plain text render (removed AnimatedNumber for major perf improvement) */}
      <span className={cn('w-[72px] sm:w-[100px] lg:w-[120px] text-right text-[11px] sm:text-[13px] md:text-[14px] font-semibold text-text-primary tabular-nums shrink-0 truncate', flashClass)}>
        {formatPriceDisplay(displayAsset.currentPrice, displayAsset.symbol, display, rate)}
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
        {formatAmountDisplay(displayAsset.changeAmount ?? 0, displayAsset.symbol, display, rate)}
      </span>

      {/* 변동률 / Change percent */}
      <div className="w-[52px] sm:w-[72px] lg:w-[84px] flex justify-end shrink-0">
        <span
          className={cn(
            'text-[11px] sm:text-[13px] font-medium tabular-nums truncate',
            isExtreme && (isRise ? 'font-semibold bg-rise/10 text-rise px-1.5 sm:px-2 py-0.5 rounded' : 'font-semibold bg-fall/10 text-fall px-1.5 sm:px-2 py-0.5 rounded'),
            !isExtreme && isRise && 'text-rise',
            !isExtreme && isFall && 'text-fall',
            !isRise && !isFall && 'text-text-quaternary',
          )}
        >
          {formatPercent(displayAsset.changePercent)}
        </span>
      </div>

      {/* 24시간 최고가 / 24h High */}
      <span className="w-[90px] text-right text-[13px] text-text-secondary tabular-nums hidden xl:block shrink-0">
        {formatPriceDisplay(displayAsset.high24h ?? 0, displayAsset.symbol, display, rate)}
      </span>

      {/* 24시간 최저가 / 24h Low */}
      <span className="w-[90px] text-right text-[13px] text-text-secondary tabular-nums hidden xl:block shrink-0">
        {formatPriceDisplay(displayAsset.low24h ?? 0, displayAsset.symbol, display, rate)}
      </span>

      {/* 거래대금 / Volume */}
      <span className="w-[80px] lg:w-[90px] text-right text-[13px] text-text-tertiary tabular-nums hidden md:block shrink-0">
        {formatVolumeDisplay((displayAsset.currentPrice * (displayAsset.volume ?? 0)), displayAsset.symbol, display, rate)}
      </span>
    </Link>
  );
}

export default React.memo(AssetListItem);
