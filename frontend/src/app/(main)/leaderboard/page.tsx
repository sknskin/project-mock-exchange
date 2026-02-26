/**
 * @file 리더보드 페이지
 * @description 수익률 기준 상위 사용자 랭킹을 보여주는 페이지
 *
 * @file Leaderboard Page
 * @description Page showing top user rankings by return rate
 */
'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import Skeleton from '@/components/ui/Skeleton';
import { cn, formatCurrencyDisplay, formatPercent } from '@/lib/format';
import { Trophy, RefreshCw, Users } from 'lucide-react';

type SortMode = 'return' | 'assets';

const medalColors: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-400',
  3: 'text-amber-600',
};

const medalEmoji: Record<number, string> = {
  1: '\uD83E\uDD47',
  2: '\uD83E\uDD48',
  3: '\uD83E\uDD49',
};

const top3Bg: Record<number, string> = {
  1: 'bg-gradient-to-r from-yellow-400/10 to-transparent',
  2: 'bg-gradient-to-r from-gray-400/10 to-transparent',
  3: 'bg-gradient-to-r from-amber-600/10 to-transparent',
};

const ROW_HEIGHT = 52;

function formatTimestamp(ts: number, locale: string): string {
  const d = new Date(ts);
  if (locale === 'en') {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${month}월 ${day}일 ${hours}:${minutes}:${seconds}`;
}

export default function LeaderboardPage() {
  const { t, locale } = useTranslation();
  const { data: leaderboard, isLoading, dataUpdatedAt, refetch } = useLeaderboard();
  const { data: rateData } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const rate = rateData?.rate;
  const fmt = (v: number) => formatCurrencyDisplay(v, currencyMode, rate);
  const user = useAuthStore((s) => s.user);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('return');

  // Sort and re-rank entries client-side (filter out users with no deposits)
  const sortedLeaderboard = useMemo(() => {
    if (!leaderboard) return [];
    const active = leaderboard.filter((e) => e.totalValue > 0);
    const sorted = active.sort((a, b) => {
      if (sortMode === 'return') return b.pnlPercent - a.pnlPercent;
      return b.totalValue - a.totalValue;
    });
    return sorted.map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [leaderboard, sortMode]);

  const myEntry = sortedLeaderboard.find((e) => e.userId === user?.id);
  const prevRankMap = useRef<Map<string, number>>(new Map());
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  useEffect(() => {
    if (!sortedLeaderboard.length) return;

    const prev = prevRankMap.current;

    sortedLeaderboard.forEach((entry) => {
      const el = rowRefs.current.get(entry.userId);
      if (!el) return;

      const prevRank = prev.get(entry.userId);
      if (prevRank !== undefined && prevRank !== entry.rank) {
        const delta = (prevRank - entry.rank) * ROW_HEIGHT;
        el.style.transition = 'none';
        el.style.transform = `translateY(${delta}px)`;
        // 리플로우 강제 / force reflow
        el.offsetHeight;
        el.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        el.style.transform = 'translateY(0)';
      }
    });

    const next = new Map<string, number>();
    sortedLeaderboard.forEach((entry) => next.set(entry.userId, entry.rank));
    prevRankMap.current = next;
  }, [sortedLeaderboard]);

  return (
    <div>
      <div className="py-6 flex items-center gap-2.5">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h1 className="text-[20px] font-extrabold text-text-primary">{t('leaderboard.title')}</h1>
      </div>

      <ExchangeRateBar />

      {/* 참여자 수 + 내 순위 + 정렬 / Participants + My Rank + Sort */}
      {!isLoading && leaderboard && leaderboard.length > 0 && (
        <div className="flex items-center justify-between gap-4 pb-3 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[12px] text-text-tertiary">
              <Users className="w-3.5 h-3.5" />
              <span>{t('leaderboard.participants')} {sortedLeaderboard.length}</span>
            </div>
            {myEntry && (
              <div className="flex items-center gap-1.5 text-[12px] text-accent font-medium">
                <Trophy className="w-3.5 h-3.5" />
                <span>{t('leaderboard.myRank')} #{myEntry.rank}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 bg-bg-secondary border border-border rounded-xl p-1">
            {([
              { key: 'return' as SortMode, label: t('leaderboard.sortByReturn') },
              { key: 'assets' as SortMode, label: t('leaderboard.sortByAssets') },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortMode(opt.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors',
                  sortMode === opt.key
                    ? 'bg-accent text-white'
                    : 'text-text-quaternary hover:text-text-secondary',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 기준 시간 + 새로고침 / Timestamp + Refresh */}
      <div className="flex items-center justify-between pb-4">
        <span className="text-[12px] text-text-quaternary">
          {dataUpdatedAt
            ? locale === 'ko'
              ? `${formatTimestamp(dataUpdatedAt, locale)} ${t('leaderboard.asOf')}`
              : formatTimestamp(dataUpdatedAt, locale)
            : t('leaderboard.loading')}
        </span>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-[12px] text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          {t('leaderboard.refresh')}
        </button>
      </div>

      {/* 테이블 헤더 / Table header */}
      <div className="flex items-center py-2.5 text-[11px] text-text-quaternary font-medium border-b border-border/80">
        <span className="w-10 sm:w-12 text-center shrink-0">{t('leaderboard.rank')}</span>
        <span className="flex-1 pl-2 min-w-0">{t('leaderboard.user')}</span>
        <span className="w-24 sm:w-36 text-right shrink-0">{t('leaderboard.totalAssets')}</span>
        <span className="w-16 sm:w-24 text-right shrink-0">{t('leaderboard.returnRate')}</span>
      </div>

      {isLoading ? (
        <div className="space-y-1 pt-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {sortedLeaderboard.map((entry) => {
            const isTop3 = entry.rank <= 3;
            const isPositive = entry.pnlPercent >= 0;
            const isMe = entry.userId === user?.id;
            const displayName = entry.name || entry.username || '-';

            return (
              <div
                key={entry.userId}
                ref={(el) => {
                  if (el) rowRefs.current.set(entry.userId, el);
                }}
                className={cn(
                  'flex items-center py-3.5',
                  isTop3 && (top3Bg[entry.rank] || 'bg-bg-secondary/20'),
                  isMe && !isTop3 && 'bg-accent/5',
                  isMe && 'ring-1 ring-accent/30 rounded-lg',
                )}
              >
                <div
                  className={cn(
                    'w-10 sm:w-12 text-center text-[14px] font-bold shrink-0',
                    medalColors[entry.rank] ?? 'text-text-quaternary',
                  )}
                >
                  {medalEmoji[entry.rank] ? (
                    <span className="text-[16px]">{medalEmoji[entry.rank]}</span>
                  ) : (
                    entry.rank
                  )}
                </div>

                <div className="flex items-center flex-1 pl-2 min-w-0">
                  <div className="min-w-0">
                    <span className={cn(
                      'font-semibold text-[14px] truncate block',
                      isMe ? 'text-accent' : 'text-text-primary',
                    )}>
                      {displayName}
                      {isMe && <span className="text-[11px] text-accent/70 ml-1.5">(me)</span>}
                    </span>
                  </div>
                </div>

                <span className="w-24 sm:w-36 text-right text-[13px] sm:text-[14px] text-text-secondary tabular-nums font-medium shrink-0">
                  {fmt(entry.totalValue)}
                </span>

                <span
                  className={cn(
                    'w-16 sm:w-24 text-right text-[13px] sm:text-[14px] font-bold tabular-nums shrink-0',
                    isPositive ? 'text-rise' : 'text-fall',
                  )}
                >
                  {formatPercent(entry.pnlPercent)}
                </span>
              </div>
            );
          })}

          {sortedLeaderboard.length === 0 && (
            <div className="py-24 text-center text-text-quaternary text-[14px]">
              {t('leaderboard.empty')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
