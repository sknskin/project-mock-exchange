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
import type { LeaderboardPeriod, LeaderboardSortBy } from '@/hooks/useLeaderboard';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import Skeleton from '@/components/ui/Skeleton';
import Tabs from '@/components/ui/Tabs';
import { cn, formatCurrencyDisplay, formatPercent } from '@/lib/format';
import {
  Trophy,
  RefreshCw,
  Users,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

/* ───────── 상수 / Constants ───────── */

const medalColors: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-400',
  3: 'text-amber-600',
};

const medalBg: Record<number, string> = {
  1: 'bg-yellow-400/15',
  2: 'bg-gray-400/15',
  3: 'bg-amber-600/15',
};

const medalBorder: Record<number, string> = {
  1: 'border-yellow-400/30',
  2: 'border-gray-400/30',
  3: 'border-amber-600/30',
};

const top3Bg: Record<number, string> = {
  1: 'bg-gradient-to-r from-yellow-400/10 to-transparent',
  2: 'bg-gradient-to-r from-gray-400/10 to-transparent',
  3: 'bg-gradient-to-r from-amber-600/10 to-transparent',
};

const ROW_HEIGHT = 56;

/* ───────── 유틸 / Utils ───────── */

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

/** 랭크 변동값 시뮬레이션 (시드 기반 의사 난수) / Simulated rank change (seed-based pseudo-random) */
function getSimulatedRankChange(userId: string, rank: number): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(hash + rank) % 100;
  if (seed < 30) return 0;
  if (seed < 65) return (seed % 5) + 1;
  return -((seed % 4) + 1);
}

/** 절대 수익 계산 / Calculate absolute PnL from totalValue and pnlPercent */
function calcAbsolutePnl(totalValue: number, pnlPercent: number): number {
  if (pnlPercent === 0) return 0;
  const initialCapital = totalValue / (1 + pnlPercent / 100);
  return totalValue - initialCapital;
}

/* ───────── 메달 배지 컴포넌트 / Medal Badge Component ───────── */

function MedalBadge({ rank }: { rank: number }) {
  if (rank > 3) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full border',
        medalBg[rank],
        medalBorder[rank],
      )}
    >
      <Medal className={cn('w-4 h-4', medalColors[rank])} />
    </div>
  );
}

/* ───────── 랭크 변동 인디케이터 / Rank Change Indicator ───────── */

function RankChangeIndicator({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] text-text-quaternary">
        <Minus className="w-3 h-3" />
      </span>
    );
  }

  if (change > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] text-rise font-medium">
        <TrendingUp className="w-3 h-3" />
        <span>{change}</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-0.5 text-[10px] text-fall font-medium">
      <TrendingDown className="w-3 h-3" />
      <span>{Math.abs(change)}</span>
    </span>
  );
}

/* ───────── 페이지 / Page ───────── */

export default function LeaderboardPage() {
  const { t, locale } = useTranslation();
  const { data: rateData } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const rate = rateData?.rate;
  const fmt = (v: number) => formatCurrencyDisplay(v, currencyMode, rate);
  const user = useAuthStore((s) => s.user);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [sortMode, setSortMode] = useState<LeaderboardSortBy>('return');

  const { data: leaderboard, isLoading, dataUpdatedAt, refetch } = useLeaderboard({ period, sortBy: sortMode });

  // 기간 필터 탭 / Period filter tabs
  const periodTabs = useMemo(
    () => [
      { key: 'all', label: t('leaderboard.periodAll') },
      { key: 'daily', label: t('leaderboard.periodDaily') },
      { key: 'weekly', label: t('leaderboard.periodWeekly') },
      { key: 'monthly', label: t('leaderboard.periodMonthly') },
    ],
    [t],
  );

  // 정렬 기준 탭 / Sort criteria tabs
  const sortTabs = useMemo(
    () => [
      { key: 'return', label: t('leaderboard.sortByReturn') },
      { key: 'absolute', label: t('leaderboard.sortByAbsolute') },
      { key: 'assets', label: t('leaderboard.sortByAssets') },
    ],
    [t],
  );

  // Sort and re-rank entries client-side (filter out users with no deposits)
  const sortedLeaderboard = useMemo(() => {
    if (!leaderboard) return [];
    const active = leaderboard.filter((e) => e.totalValue > 0);
    const sorted = active.sort((a, b) => {
      if (sortMode === 'return') return b.pnlPercent - a.pnlPercent;
      if (sortMode === 'absolute') {
        return calcAbsolutePnl(b.totalValue, b.pnlPercent) - calcAbsolutePnl(a.totalValue, a.pnlPercent);
      }
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

  // 행 애니메이션 / Row animation on rank change
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

  // 현재 정렬 기준의 3번째 컬럼 헤더 / Third column header based on sort mode
  const thirdColHeader = sortMode === 'absolute' ? t('leaderboard.absolutePnl') : t('leaderboard.totalAssets');

  return (
    <div>
      {/* 헤더 / Header */}
      <div className="py-6 flex items-start justify-between">
        <div className="flex items-center gap-2.5 h-10">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h1 className="text-[20px] font-extrabold text-text-primary">{t('leaderboard.title')}</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-semibold transition-colors border',
              isRefreshing
                ? 'border-border text-text-quaternary cursor-not-allowed'
                : 'border-accent/30 text-accent hover:bg-accent/10',
            )}
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            {t('leaderboard.refresh')}
          </button>
          <span className="text-[11px] text-text-quaternary tabular-nums pr-1">
            {dataUpdatedAt
              ? locale === 'ko'
                ? `${formatTimestamp(dataUpdatedAt, locale)} ${t('leaderboard.asOf')}`
                : formatTimestamp(dataUpdatedAt, locale)
              : t('leaderboard.loading')}
          </span>
        </div>
      </div>

      <ExchangeRateBar />

      {/* 기간 필터 탭 / Period filter tabs */}
      <div className="pt-2 pb-4">
        <Tabs
          tabs={periodTabs}
          activeTab={period}
          onChange={(key) => setPeriod(key as LeaderboardPeriod)}
          variant="pill"
        />
      </div>

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
          {/* 정렬 기준 탭 / Sort criteria tabs */}
          <div className="flex items-center gap-1 bg-bg-secondary border border-border rounded-xl p-1">
            {sortTabs.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortMode(opt.key as LeaderboardSortBy)}
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

      {/* 내 순위 카드 (로그인 시) / My rank card (when logged in) */}
      {myEntry && !isLoading && (
        <div className="mb-4 rounded-xl border border-accent/30 bg-accent/[0.06] p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/15 border border-accent/30 shrink-0">
                <span className="text-[14px] font-bold text-accent">#{myEntry.rank}</span>
              </div>
              <div className="min-w-0">
                <span className="block text-[14px] font-semibold text-accent truncate">
                  {myEntry.name || myEntry.username || '-'}
                </span>
                <span className="block text-[11px] text-text-tertiary mt-0.5">
                  {t('leaderboard.myRank')}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="block text-[14px] font-medium text-text-secondary tabular-nums">
                {fmt(myEntry.totalValue)}
              </span>
              <span
                className={cn(
                  'block text-[13px] font-bold tabular-nums mt-0.5',
                  myEntry.pnlPercent >= 0 ? 'text-rise' : 'text-fall',
                )}
              >
                {formatPercent(myEntry.pnlPercent)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 테이블 헤더 / Table header */}
      <div className="flex items-center py-2.5 text-[11px] text-text-quaternary font-medium border-b border-border/80">
        <span className="w-10 sm:w-14 text-center shrink-0">{t('leaderboard.rank')}</span>
        <span className="flex-1 pl-2 min-w-0">{t('leaderboard.user')}</span>
        <span className="hidden sm:block w-36 text-right shrink-0">{thirdColHeader}</span>
        <span className="w-20 sm:w-24 text-right shrink-0">{t('leaderboard.returnRate')}</span>
        <span className="w-10 sm:w-14 text-center shrink-0"></span>
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
            const rankChange = getSimulatedRankChange(entry.userId, entry.rank);
            const absolutePnl = calcAbsolutePnl(entry.totalValue, entry.pnlPercent);

            return (
              <div
                key={entry.userId}
                ref={(el) => {
                  if (el) rowRefs.current.set(entry.userId, el);
                }}
                className={cn(
                  'flex items-center py-3 sm:py-3.5 transition-colors',
                  isTop3 && (top3Bg[entry.rank] || 'bg-bg-secondary/20'),
                  isMe && 'bg-accent/[0.07] ring-1 ring-accent/30 rounded-lg',
                )}
              >
                {/* 순위 + 메달 / Rank + Medal */}
                <div className="w-10 sm:w-14 flex flex-col items-center justify-center gap-0.5 shrink-0">
                  {isTop3 ? (
                    <MedalBadge rank={entry.rank} />
                  ) : (
                    <span className="text-[14px] font-bold text-text-quaternary tabular-nums">
                      {entry.rank}
                    </span>
                  )}
                </div>

                {/* 사용자 정보 / User info */}
                <div className="flex items-center flex-1 pl-2 min-w-0">
                  <div className="min-w-0">
                    <span
                      className={cn(
                        'font-semibold text-[14px] truncate block',
                        isMe ? 'text-accent' : 'text-text-primary',
                      )}
                    >
                      {displayName}
                      {isMe && <span className="text-[11px] text-accent/70 ml-1.5">(me)</span>}
                    </span>
                    {/* 모바일: 자산 표시 / Mobile: show assets */}
                    <span className="block sm:hidden text-[11px] text-text-tertiary mt-0.5 tabular-nums">
                      {sortMode === 'absolute' ? (
                        <span className={absolutePnl >= 0 ? 'text-rise' : 'text-fall'}>
                          {absolutePnl >= 0 ? '+' : ''}{fmt(absolutePnl)}
                        </span>
                      ) : (
                        fmt(entry.totalValue)
                      )}
                    </span>
                  </div>
                </div>

                {/* 자산/절대수익 (데스크탑) / Assets/Absolute PnL (desktop) */}
                <span className="hidden sm:block w-36 text-right text-[14px] text-text-secondary tabular-nums font-medium shrink-0">
                  {sortMode === 'absolute' ? (
                    <span className={absolutePnl >= 0 ? 'text-rise' : 'text-fall'}>
                      {absolutePnl >= 0 ? '+' : ''}{fmt(absolutePnl)}
                    </span>
                  ) : (
                    fmt(entry.totalValue)
                  )}
                </span>

                {/* 수익률 / Return Rate */}
                <span
                  className={cn(
                    'w-20 sm:w-24 text-right text-[13px] sm:text-[14px] font-bold tabular-nums shrink-0',
                    isPositive ? 'text-rise' : 'text-fall',
                  )}
                >
                  {formatPercent(entry.pnlPercent)}
                </span>

                {/* 순위 변동 / Rank change */}
                <div className="w-10 sm:w-14 flex justify-center shrink-0">
                  <RankChangeIndicator change={rankChange} />
                </div>
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
