/**
 * @file 스포트라이트 검색 모달
 * @description macOS Spotlight 스타일의 종목 검색 모달 (/ 단축키 지원, 거래대금 Top 5 표시)
 *
 * @file Spotlight Search Modal
 * @description macOS Spotlight-style asset search modal with / shortcut and top 5 turnover display
 */
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp } from 'lucide-react';
import { cn, formatPriceDisplay, formatPercent } from '@/lib/format';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import type { Asset } from '@/types';

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  onLoginRequired?: () => void;
}

export default function SpotlightSearch({ isOpen, onClose, assets, onLoginRequired }: SpotlightSearchProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { display } = useCurrencyDisplay();
  const { data: rateData } = useExchangeRate();
  const rate = rateData?.rate;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 거래대금 Top 5 / Top 5 by turnover
  const top5 = useMemo(() =>
    [...assets]
      .sort((a, b) => (b.currentPrice * (b.volume ?? 0)) - (a.currentPrice * (a.volume ?? 0)))
      .slice(0, 5),
    [assets],
  );

  // 검색 결과 / Search results
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return assets
      .filter((a) => a.symbol.toLowerCase().includes(q) || (a.name ?? '').toLowerCase().includes(q))
      .slice(0, 10);
  }, [query, assets]);

  const displayList = query.trim() ? searchResults : top5;

  // 모달 열릴 때 포커스 / Focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ESC 키 닫기 + 키보드 네비게이션 / ESC close + keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, displayList.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && displayList[selectedIndex]) {
        e.preventDefault();
        handleSelect(displayList[selectedIndex]);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, displayList, selectedIndex, onClose]);

  // 선택 시 상세 이동 / Navigate to detail on select
  const handleSelect = (asset: Asset) => {
    if (!isAuthenticated) {
      onClose();
      onLoginRequired?.();
      return;
    }
    onClose();
    router.push(`/asset/${asset.symbol}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[15vh] sm:pt-[20vh]">
      {/* 오버레이 / Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 / Modal */}
      <div className="relative w-[90vw] max-w-[560px] bg-bg-primary border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* 검색 입력란 / Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <Search className="w-5 h-5 text-text-quaternary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={t('nav.search').replace(/^를?\s*/, '') || 'Search assets...'}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            className="flex-1 bg-transparent text-[16px] text-text-primary placeholder-text-quaternary focus:outline-none font-medium"
          />
          <kbd className="px-2 py-0.5 text-[11px] border border-border rounded text-text-tertiary font-mono shrink-0">
            ESC
          </kbd>
        </div>

        {/* 결과 리스트 / Results list */}
        <div className="max-h-[340px] overflow-y-auto">
          {!query.trim() && top5.length > 0 && (
            <div className="px-5 pt-3 pb-1.5 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-text-quaternary" />
              <span className="text-[11px] font-semibold text-text-quaternary uppercase tracking-wider">
                {t('market.top5Turnover').replace('\n', ' ')}
              </span>
            </div>
          )}

          {displayList.map((asset, index) => {
            const isRise = asset.changePercent > 0;
            const isFall = asset.changePercent < 0;

            return (
              <button
                key={asset.symbol}
                onClick={() => handleSelect(asset)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'w-full flex items-center gap-3 px-5 py-3 transition-colors text-left',
                  selectedIndex === index ? 'bg-accent/10' : 'hover:bg-bg-secondary/60',
                )}
              >
                {/* 아이콘 / Icon */}
                <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center text-[10px] font-bold text-text-tertiary shrink-0">
                  {asset.symbol.slice(0, 2)}
                </div>

                {/* 이름 + 심볼 / Name + Symbol */}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-text-primary truncate">
                    {asset.name ?? asset.symbol}
                  </div>
                  <div className="text-[11px] text-text-quaternary">{asset.symbol}</div>
                </div>

                {/* 가격 + 등락률 / Price + Change */}
                <div className="text-right shrink-0">
                  <div className="text-[14px] font-semibold text-text-primary tabular-nums">
                    {formatPriceDisplay(asset.currentPrice, asset.symbol, display, rate)}
                  </div>
                  <div
                    className={cn(
                      'text-[11px] font-semibold tabular-nums',
                      isRise && 'text-rise',
                      isFall && 'text-fall',
                      !isRise && !isFall && 'text-text-quaternary',
                    )}
                  >
                    {formatPercent(asset.changePercent)}
                  </div>
                </div>
              </button>
            );
          })}

          {query.trim() && searchResults.length === 0 && (
            <div className="py-12 text-center text-text-quaternary text-[14px]">
              {t('table.empty')}
            </div>
          )}
        </div>

        {/* 하단 힌트 / Bottom hint */}
        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-border text-[11px] text-text-quaternary">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 border border-border rounded font-mono text-[10px]">↑↓</kbd>
            이동
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 border border-border rounded font-mono text-[10px]">Enter</kbd>
            선택
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 border border-border rounded font-mono text-[10px]">ESC</kbd>
            닫기
          </span>
        </div>
      </div>
    </div>
  );
}
