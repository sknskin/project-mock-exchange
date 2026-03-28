/**
 * @file 리더보드 카드(행) 컴포넌트
 * @description 개별 리더보드 순위 행을 렌더링하는 컴포넌트 (순위, 사용자명, 수익률, 팔로우/카피 버튼)
 *
 * @file Leaderboard Card (Row) Component
 * @description Component rendering an individual leaderboard rank row (rank, username, return, follow/copy buttons)
 *
 * BD-M-02: 리더보드 페이지에서 개별 행 렌더링을 분리
 * BD-M-02: Extracted individual row rendering from leaderboard page
 */
'use client';

import { forwardRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn, formatPercent } from '@/lib/format';
import {
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  UserPlus,
  UserCheck,
  Copy,
} from 'lucide-react';
import type { LeaderboardSortBy } from '@/hooks/useLeaderboard';
import type { LeaderboardEntry } from './LeaderboardTable';

/* ── 상수 / Constants ── */

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

/** 절대 수익 계산
 * Calculate absolute PnL from totalValue and pnlPercent */
function calcAbsolutePnl(totalValue: number, pnlPercent: number): number {
  if (pnlPercent === 0) return 0;
  const initialCapital = totalValue / (1 + pnlPercent / 100);
  return totalValue - initialCapital;
}

/* ── 서브 컴포넌트 / Sub-components ── */

function MedalBadge({ rank }: { rank: number }) {
  if (rank > 3) return null;
  return (
    <div className={cn('flex items-center justify-center w-8 h-8 rounded-full border', medalBg[rank], medalBorder[rank])}>
      <Medal className={cn('w-4 h-4', medalColors[rank])} />
    </div>
  );
}

function RankChangeIndicator({ change }: { change: number }) {
  if (change === 0) {
    return <span className="flex items-center gap-0.5 text-[10px] text-text-quaternary"><Minus className="w-3 h-3" /></span>;
  }
  if (change > 0) {
    return <span className="flex items-center gap-0.5 text-[10px] text-rise font-medium"><TrendingUp className="w-3 h-3" /><span>{change}</span></span>;
  }
  return <span className="flex items-center gap-0.5 text-[10px] text-fall font-medium"><TrendingDown className="w-3 h-3" /><span>{Math.abs(change)}</span></span>;
}

/* ── 메인 컴포넌트 / Main Component ── */

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  rankChange: number;
  sortMode: LeaderboardSortBy;
  isAuthenticated: boolean;
  isFollowed: boolean;
  isCopyTrading: boolean;
  isSelf: boolean;
  fmt: (v: number) => string;
  onToggleFollow: (userId: string) => void;
  onCopyTrade: (target: { id: string; name: string; pnlPercent: number }) => void;
  onOpenProfile: (entry: LeaderboardEntry) => void;
}

const LeaderboardCard = forwardRef<HTMLDivElement, LeaderboardCardProps>(
  function LeaderboardCard(
    { entry, rankChange, sortMode, isAuthenticated, isFollowed, isCopyTrading, isSelf, fmt, onToggleFollow, onCopyTrade, onOpenProfile },
    ref,
  ) {
    const { t } = useTranslation();
    const isTop3 = entry.rank <= 3;
    const isPositive = entry.pnlPercent >= 0;
    const displayName = entry.name || entry.username || '-';
    const absolutePnl = calcAbsolutePnl(entry.totalValue, entry.pnlPercent);

    return (
      <div
        ref={ref}
        style={{ willChange: 'transform' }}
        className={cn(
          'flex items-center py-3 sm:py-3.5 transition-colors',
          isTop3 && (top3Bg[entry.rank] || 'bg-bg-secondary/20'),
          entry.isMe && 'bg-accent/[0.07] ring-1 ring-accent/30 rounded-lg',
        )}
      >
        {/* 순위 + 메달 / Rank + Medal */}
        <div className="w-10 sm:w-14 flex flex-col items-center justify-center gap-0.5 shrink-0">
          {isTop3 ? <MedalBadge rank={entry.rank} /> : (
            <span className="text-[14px] font-bold text-text-quaternary tabular-nums">{entry.rank}</span>
          )}
        </div>

        {/* 사용자 정보 / User info */}
        <button
          type="button"
          onClick={() => onOpenProfile(entry)}
          className="flex items-center flex-1 pl-2 min-w-0 text-left cursor-pointer rounded-lg hover:bg-bg-secondary/60 transition-colors -my-1 py-1"
        >
          <div className="min-w-0">
            <span className={cn('font-semibold text-[14px] truncate block', entry.isMe ? 'text-accent' : 'text-text-primary')}>
              {displayName}
              {entry.isMe && <span className="text-[11px] text-accent/70 ml-1.5">(me)</span>}
            </span>
            <span className="block sm:hidden text-[11px] text-text-tertiary mt-0.5 tabular-nums">
              {sortMode === 'absolute' ? (
                <span className={absolutePnl >= 0 ? 'text-rise' : 'text-fall'}>
                  {absolutePnl >= 0 ? '+' : ''}{fmt(absolutePnl)}
                </span>
              ) : fmt(entry.totalValue)}
            </span>
          </div>
        </button>

        {/* 자산/절대수익 (데스크탑) / Assets/Absolute PnL (desktop) */}
        <span className="hidden sm:block w-36 text-right text-[14px] text-text-secondary tabular-nums font-medium shrink-0">
          {sortMode === 'absolute' ? (
            <span className={absolutePnl >= 0 ? 'text-rise' : 'text-fall'}>
              {absolutePnl >= 0 ? '+' : ''}{fmt(absolutePnl)}
            </span>
          ) : fmt(entry.totalValue)}
        </span>

        {/* 수익률 / Return Rate */}
        <span className={cn('w-20 sm:w-24 text-right text-[13px] sm:text-[14px] font-bold tabular-nums shrink-0', isPositive ? 'text-rise' : 'text-fall')}>
          {formatPercent(entry.pnlPercent)}
        </span>

        {/* 순위 변동 / Rank change */}
        <div className="w-10 sm:w-14 flex justify-center shrink-0">
          <RankChangeIndicator change={rankChange} />
        </div>

        {/* 팔로우 + 카피 트레이딩 버튼 / Follow + Copy buttons */}
        {isAuthenticated && (
          <div className="flex w-14 sm:w-24 items-center justify-center gap-0.5 sm:gap-1 shrink-0">
            {!entry.isMe && (
              <>
                <button
                  onClick={() => onToggleFollow(entry.id)}
                  className={cn(
                    'p-1 sm:p-1.5 rounded-lg transition-colors',
                    isFollowed ? 'text-accent bg-accent/10' : 'text-text-quaternary hover:text-accent hover:bg-accent/10',
                  )}
                  title={isFollowed ? t('follow.unfollow') : t('follow.follow')}
                >
                  {isFollowed ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    if (isSelf) return;
                    onCopyTrade({ id: entry.id, name: displayName, pnlPercent: entry.pnlPercent });
                  }}
                  className={cn(
                    'p-1 sm:p-1.5 rounded-lg transition-colors',
                    isSelf
                      ? 'text-text-quaternary/30 cursor-not-allowed'
                      : isCopyTrading
                        ? 'text-accent bg-accent/10'
                        : 'text-text-quaternary hover:text-accent hover:bg-accent/10',
                  )}
                  title={isSelf ? t('follow.cannotCopyTradeSelf') : isCopyTrading ? t('copyTrade.active') : t('copyTrade.title')}
                  disabled={isSelf}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  },
);

export default LeaderboardCard;
