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
import { useTranslation } from '@/hooks/useTranslation';
import { useFollowing, useFollowTrader, useUnfollowTrader } from '@/hooks/useFollow';
import { useCopyTradeStatus } from '@/hooks/useCopyTrade';
import { useAuthStore } from '@/stores/auth';
import ExchangeRateBar from '@/components/market/ExchangeRateBar';
import Skeleton from '@/components/ui/Skeleton';
import RefreshControl from '@/components/ui/RefreshControl';
import CopyTradeModal from '@/components/trading/CopyTradeModal';
import UserProfileModal from '@/components/leaderboard/UserProfileModal';
import type { UserProfileData } from '@/components/leaderboard/UserProfileModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { cn, formatCurrencyDisplay, formatPercent } from '@/lib/format';
import {
  Trophy,
  Users,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  UserPlus,
  UserCheck,
  Copy,
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

/** 절대 수익 계산
 * Calculate absolute PnL from totalValue and pnlPercent */
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
  const { t } = useTranslation();
  const { query: { data: rateData } } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const rate = rateData?.rate;
  const fmt = (v: number) => formatCurrencyDisplay(v, currencyMode, rate);
  const [period, setPeriodRaw] = useState<LeaderboardPeriod>('all');
  const setPeriod = useCallback((v: LeaderboardPeriod) => { setPeriodRaw(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const [sortMode, setSortMode] = useState<LeaderboardSortBy>('return');

  const [investedOnly, setInvestedOnly] = useState(true);
  const [copyTradeOnly, setCopyTradeOnly] = useState(false);
  const { data: leaderboard, isLoading, refetch } = useLeaderboard({ period, sortBy: sortMode });

  // 팔로우 상태 훅 / Follow state hooks
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.user);
  const { data: followingData } = useFollowing();
  const followTrader = useFollowTrader();
  const unfollowTrader = useUnfollowTrader();
  const followedUserIds = useMemo(() => {
    if (!followingData) return new Set<string>();
    return new Set(followingData.map((f) => f.followeeId));
  }, [followingData]);

  // 카피 트레이딩 상태 / Copy trade status
  const { data: copyTradeConfigs } = useCopyTradeStatus();
  const copyTradingUserIds = useMemo(() => {
    if (!copyTradeConfigs) return new Set<string>();
    return new Set(copyTradeConfigs.filter((c) => c.isActive).map((c) => c.traderId));
  }, [copyTradeConfigs]);

  // 카피 트레이딩 모달 상태 / Copy trade modal state
  const [copyTradeTarget, setCopyTradeTarget] = useState<{ id: string; name: string; pnlPercent: number } | null>(null);

  // 언팔로우 확인 모달 상태 / Unfollow confirm modal state
  const [unfollowTarget, setUnfollowTarget] = useState<string | null>(null);

  // 사용자 프로필 모달 상태 / User profile modal state
  const [profileTarget, setProfileTarget] = useState<UserProfileData | null>(null);

  /** 팔로우/언팔로우 토글 / Toggle follow/unfollow */
  const toggleFollow = useCallback((userId: string) => {
    if (!isAuthenticated) return;
    // 자기 자신 팔로우 불가 / Cannot follow yourself
    if (currentUser && currentUser.id === userId) return;
    if (followedUserIds.has(userId)) {
      // 언팔로우 시 확인 모달 표시 / Show confirmation before unfollow
      setUnfollowTarget(userId);
    } else {
      followTrader.mutate(userId);
    }
  }, [isAuthenticated, currentUser, followedUserIds, followTrader]);

  /** 언팔로우 확인 처리 / Confirm unfollow handler */
  const confirmUnfollow = useCallback(() => {
    if (unfollowTarget) {
      unfollowTrader.mutate(unfollowTarget);
      setUnfollowTarget(null);
    }
  }, [unfollowTarget, unfollowTrader]);

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

  /**
   * 클라이언트 측 정렬 + 순위 재계산 — 입금 없는 사용자 제외, userId 중복 제거
   * Client-side sort + re-rank — filters out zero-deposit users, deduplicates by userId
   */
  const sortedLeaderboard = useMemo(() => {
    if (!leaderboard) return [];
    // 입금 없는 사용자 제외 + userId 중복 제거 / Exclude zero-deposit users + deduplicate by userId
    const active = leaderboard.filter((e) => e.totalValue > 0);
    const unique = [...new Map(active.map((e) => [e.id, e])).values()];
    // 투자 여부 필터: 체크 시 실제 거래 이력이 있는 사용자만 표시 (hasTraded 기반)
    // Investment filter: when checked, only users who actually traded (based on hasTraded flag)
    let filtered = investedOnly ? unique.filter((e) => e.hasTraded) : unique;
    // 카피트레이딩 중인 투자자만 필터 / Filter to only copy-trading targets
    if (copyTradeOnly) filtered = filtered.filter((e) => copyTradingUserIds.has(e.id));
    const sorted = filtered.sort((a, b) => {
      if (sortMode === 'return') return b.pnlPercent - a.pnlPercent;
      if (sortMode === 'absolute') {
        return calcAbsolutePnl(b.totalValue, b.pnlPercent) - calcAbsolutePnl(a.totalValue, a.pnlPercent);
      }
      return b.totalValue - a.totalValue;
    });
    return sorted.map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [leaderboard, sortMode, investedOnly, copyTradeOnly, copyTradingUserIds]);

  // 현재 사용자 순위 강조 / Current user rank highlight
  const myEntry = sortedLeaderboard.find((e) => e.isMe);
  // 이전 순위 저장 (순위 변동 애니메이션용) / Previous rank storage (for rank change animation)
  const prevRankMap = useRef<Map<string, number>>(new Map());
  // 행 DOM 참조 (순위 이동 애니메이션용) / Row DOM refs (for rank movement animation)
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // 필터/정렬 변경 시 이전 순위 맵 초기화 — 잘못된 순위 변동 애니메이션 방지
  // Reset previous rank map on filter/sort change — prevents incorrect rank change animation
  useEffect(() => {
    prevRankMap.current = new Map();
  }, [period, sortMode, investedOnly, copyTradeOnly]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  /**
   * 순위 변동 시 행 슬라이드 애니메이션 — FLIP 기법 사용
   * Row slide animation on rank change — uses FLIP technique
   * 1) 이전 위치로 즉시 이동 (transition: none)
   * 2) offsetHeight로 리플로우 강제
   * 3) 원래 위치로 애니메이션 복귀
   */
  useEffect(() => {
    if (!sortedLeaderboard.length) return;

    const prev = prevRankMap.current;

    // FR-H-02: 배치 FLIP — 순위가 실제로 변경된 행만 애니메이션 (변경 없는 행은 건너뜀)
    // FR-H-02: Batched FLIP — only animate rows that actually changed rank (skip unchanged rows)
    const movedEls: HTMLElement[] = [];
    sortedLeaderboard.forEach((entry) => {
      const prevRank = prev.get(entry.id);
      // 순위가 같으면 건너뜀 / Skip if rank unchanged
      if (prevRank === undefined || prevRank === entry.rank) return;

      const el = rowRefs.current.get(entry.id);
      if (!el) return;

      const delta = (prevRank - entry.rank) * ROW_HEIGHT;
      el.style.transition = 'none';
      el.style.transform = `translateY(${delta}px)`;
      movedEls.push(el);
    });

    if (movedEls.length > 0) {
      // 단일 리플로우 강제 후 애니메이션 시작 / Single forced reflow then animate
      void movedEls[0].offsetHeight;
      requestAnimationFrame(() => {
        movedEls.forEach((el) => {
          el.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          el.style.transform = 'translateY(0)';
        });
      });
    }

    const next = new Map<string, number>();
    sortedLeaderboard.forEach((entry) => next.set(entry.id, entry.rank));
    prevRankMap.current = next;
  }, [sortedLeaderboard]);

  // 현재 정렬 기준의 3번째 컬럼 헤더 / Third column header based on sort mode
  const thirdColHeader = sortMode === 'absolute' ? t('leaderboard.absolutePnl') : t('leaderboard.totalAssets');

  return (
    <div>
      {/* 헤더 / Header */}
      <div className="py-6 flex items-center justify-between h-[88px]">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-5 h-5 text-accent" />
          <h1 className="text-[20px] font-extrabold text-text-primary">{t('leaderboard.title')}</h1>
        </div>
        <RefreshControl intervalSeconds={10} onRefresh={handleRefresh} />
      </div>

      <ExchangeRateBar />

      {/* 기간 필터 탭 — 좁은 화면에서 가로 스크롤 허용 (WCAG 터치 타겟 44px 보장)
          Period filter tabs — allows horizontal scroll on narrow screens (WCAG 44px touch target) */}
      <div className="flex items-center border-b border-border mb-5 overflow-x-auto scrollbar-hide">
        {periodTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPeriod(tab.key as LeaderboardPeriod)}
            className={cn(
              'relative px-4 py-2.5 text-[14px] font-semibold transition-colors whitespace-nowrap min-h-[44px] min-w-[44px]',
              period === tab.key
                ? 'text-accent'
                : 'text-text-tertiary hover:text-text-primary',
            )}
          >
            {tab.label}
            {period === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* 참여자 수 + 내 순위 + 정렬 — 좁은 화면에서 줄 바꿈 + 가로 스크롤 허용
          Participants + My Rank + Sort — flex-wrap + overflow-x-auto for narrow screens */}
      {!isLoading && leaderboard && leaderboard.length > 0 && (
        <div className="flex items-center justify-between gap-4 pb-3 flex-wrap overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={investedOnly}
                  onChange={(e) => setInvestedOnly(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-[34px] h-[18px] rounded-full bg-border peer-checked:bg-accent transition-colors" />
                <div className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-[16px]" />
              </div>
              <span className="text-[12px] font-medium text-text-tertiary group-hover:text-text-secondary transition-colors">{t('leaderboard.investedOnly')}</span>
            </label>
            {isAuthenticated && (
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={copyTradeOnly}
                    onChange={(e) => setCopyTradeOnly(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-[34px] h-[18px] rounded-full bg-border peer-checked:bg-accent transition-colors" />
                  <div className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-[16px]" />
                </div>
                <span className="text-[12px] font-medium text-text-tertiary group-hover:text-text-secondary transition-colors">{t('leaderboard.copyTradeOnly')}</span>
              </label>
            )}
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
          {/* 정렬 기준 탭 — 최소 터치 타겟 44px 보장 / Sort criteria tabs — ensures 44px min touch target */}
          <div className="flex items-center gap-1 bg-bg-secondary border border-border rounded-xl p-1 shrink-0">
            {sortTabs.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortMode(opt.key as LeaderboardSortBy)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap min-h-[44px] min-w-[44px]',
                  sortMode === opt.key
                    ? 'bg-accent text-white'
                    : 'text-text-tertiary hover:text-text-secondary',
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

      {/* 사용자 프로필 모달 / User Profile Modal */}
      <UserProfileModal
        user={profileTarget}
        onClose={() => setProfileTarget(null)}
        isFollowed={profileTarget ? followedUserIds.has(profileTarget.id) : false}
        isCopyTrading={profileTarget ? copyTradingUserIds.has(profileTarget.id) : false}
        onToggleFollow={(userId) => {
          toggleFollow(userId);
          setProfileTarget(null);
        }}
        onCopyTrade={(target) => {
          setCopyTradeTarget(target);
          setProfileTarget(null);
        }}
        isAuthenticated={isAuthenticated}
      />

      {/* 카피 트레이딩 모달 / Copy Trade Modal */}
      {copyTradeTarget && (
        <CopyTradeModal
          isOpen={!!copyTradeTarget}
          onClose={() => setCopyTradeTarget(null)}
          traderId={copyTradeTarget.id}
          traderName={copyTradeTarget.name}
          returnRate={copyTradeTarget.pnlPercent}
        />
      )}

      {/* 테이블 헤더 / Table header */}
      <div className="flex items-center py-2.5 text-[11px] text-text-tertiary font-medium border-b border-border/80">
        <span className="w-10 sm:w-14 text-center shrink-0">{t('leaderboard.rank')}</span>
        <span className="flex-1 pl-2 min-w-0">{t('leaderboard.user')}</span>
        <span className="hidden sm:block w-36 text-right shrink-0">{thirdColHeader}</span>
        <span className="w-20 sm:w-24 text-right shrink-0">{t('leaderboard.returnRate')}</span>
        <span className="w-10 sm:w-14 text-center shrink-0"></span>
        {/* 팔로우/카피 액션 열 (인증 시만) / Follow/Copy action column (auth only) */}
        {isAuthenticated && <span className="w-14 sm:w-24 text-center shrink-0"></span>}
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
            const isMe = entry.isMe;
            const displayName = entry.name || entry.username || '-';
            // 실제 이전 순위 대비 변동 계산 (Real rank change from previous data)
            const prevRank = prevRankMap.current.get(entry.id);
            const rankChange = prevRank !== undefined ? prevRank - entry.rank : 0;
            const absolutePnl = calcAbsolutePnl(entry.totalValue, entry.pnlPercent);

            return (
              <div
                key={entry.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(entry.id, el);
                }}
                style={{ willChange: 'transform' }}
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

                {/* 사용자 정보 (클릭 시 프로필 모달) / User info (click to open profile modal) */}
                <button
                  type="button"
                  onClick={() =>
                    setProfileTarget({
                      id: entry.id,
                      name: entry.name || '',
                      username: entry.username || '',
                      rank: entry.rank,
                      totalValue: entry.totalValue,
                      pnlPercent: entry.pnlPercent,
                      isMe: entry.isMe,
                    })
                  }
                  className="flex items-center flex-1 pl-2 min-w-0 text-left cursor-pointer rounded-lg hover:bg-bg-secondary/60 transition-colors -my-1 py-1"
                >
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
                </button>

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

                {/* 팔로우 + 카피 트레이딩 버튼 (인증 시, 본인 제외) / Follow + Copy buttons (auth, not self) */}
                {isAuthenticated && (
                  <div className="flex w-14 sm:w-24 items-center justify-center gap-0.5 sm:gap-1 shrink-0">
                    {!isMe && (
                      <>
                        <button
                          onClick={() => toggleFollow(entry.id)}
                          className={cn(
                            'p-1 sm:p-1.5 rounded-lg transition-colors',
                            followedUserIds.has(entry.id)
                              ? 'text-accent bg-accent/10'
                              : 'text-text-quaternary hover:text-accent hover:bg-accent/10',
                          )}
                          title={followedUserIds.has(entry.id) ? t('follow.unfollow') : t('follow.follow')}
                        >
                          {followedUserIds.has(entry.id) ? (
                            <UserCheck className="w-3.5 h-3.5" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            // 자기 자신 카피트레이딩 방지 / Prevent self copy trading
                            if (currentUser && currentUser.id === entry.id) return;
                            setCopyTradeTarget({ id: entry.id, name: displayName, pnlPercent: entry.pnlPercent });
                          }}
                          className={cn(
                            'p-1 sm:p-1.5 rounded-lg transition-colors',
                            currentUser && currentUser.id === entry.id
                              ? 'text-text-quaternary/30 cursor-not-allowed'
                              : copyTradingUserIds.has(entry.id)
                                ? 'text-accent bg-accent/10'
                                : 'text-text-quaternary hover:text-accent hover:bg-accent/10',
                          )}
                          title={currentUser && currentUser.id === entry.id ? t('follow.cannotCopyTradeSelf') : copyTradingUserIds.has(entry.id) ? t('copyTrade.active') : t('copyTrade.title')}
                          disabled={!!(currentUser && currentUser.id === entry.id)}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
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

      {/* 언팔로우 확인 모달 / Unfollow Confirmation Modal */}
      <ConfirmModal
        isOpen={!!unfollowTarget}
        onClose={() => setUnfollowTarget(null)}
        onConfirm={confirmUnfollow}
        title={t('follow.unfollowConfirmTitle')}
        message={t('follow.unfollowConfirmMessage')}
        confirmLabel={t('follow.unfollow')}
        cancelLabel={t('common.cancel')}
        confirmVariant="danger"
      />
    </div>
  );
}
