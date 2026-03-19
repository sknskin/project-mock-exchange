/**
 * @file 트레이더 랭킹 탭 컴포넌트
 * @description 커뮤니티 페이지의 트레이더 랭킹 탭 UI
 *
 * @file Traders Tab Component
 * @description Community page traders tab UI — extracted from community page for code splitting
 */
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn, formatPercent, formatCurrencyDisplay } from '@/lib/format';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useFollowing, useFollowTrader, useUnfollowTrader, useBatchFollowCounts } from '@/hooks/useFollow';
import { useCopyTradeStatus } from '@/hooks/useCopyTrade';
import CopyTradeModal from '@/components/trading/CopyTradeModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  Users,
  UserPlus,
  UserCheck,
  Trophy,
  Copy,
} from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';
import type { LeaderboardEntry } from '@/types';

/** 트레이더 카드 — 리더보드 기반 트레이더 정보 + 팔로우 기능
 * Trader card — leaderboard-based trader info + follow toggle */
function TraderCard({
  entry,
  isFollowed,
  isCopyTrading,
  followerCount,
  onToggleFollow,
  onCopyTrade,
  t,
  fmt,
}: {
  entry: LeaderboardEntry;
  isFollowed: boolean;
  isCopyTrading: boolean;
  followerCount: number;
  onToggleFollow: () => void;
  onCopyTrade: () => void;
  t: (key: TranslationKey) => string;
  fmt: (v: number) => string;
}) {
  const displayName = entry.name || entry.username || '-';

  return (
    <div className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 hover:border-accent/30 transition-all">
      {/* 아바타 + 이름 / Avatar + Name */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
          <span className="text-[14px] font-bold text-accent">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-[14px] font-semibold text-text-primary truncate">
            {displayName}
          </span>
          <span className="flex items-center gap-1 text-[12px] text-yellow-400 font-medium">
            <Trophy className="w-3 h-3" />
            {t('community.rank')} #{entry.rank}
          </span>
        </div>
      </div>

      {/* 통계 / Stats */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-text-tertiary">{t('community.returnRate')}</span>
          <span
            className={cn(
              'text-[13px] font-bold tabular-nums',
              entry.pnlPercent >= 0 ? 'text-rise' : 'text-fall',
            )}
          >
            {formatPercent(entry.pnlPercent)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-text-tertiary">{t('community.totalAssets')}</span>
          <span className="text-[13px] font-medium text-text-secondary tabular-nums">
            {fmt(entry.totalValue)}
          </span>
        </div>
      </div>

      {/* 구분선 / Divider */}
      <div className="border-t border-border/50 my-3" />

      {/* 팔로우 버튼 + 카피 트레이딩 + 팔로워 수 / Follow button + Copy Trade button + followers */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleFollow}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors',
              isFollowed
                ? 'bg-bg-tertiary text-text-secondary'
                : 'bg-accent text-white hover:bg-accent/90',
            )}
          >
            {isFollowed ? (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                {t('community.following')}
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                {t('community.follow')}
              </>
            )}
          </button>
          {/* 카피 트레이딩 버튼 — 팔로우와 동일 스타일 / Copy Trade button — same style as follow */}
          <button
            onClick={onCopyTrade}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors',
              isCopyTrading
                ? 'bg-bg-tertiary text-text-secondary'
                : 'bg-accent/10 text-accent hover:bg-accent/20',
            )}
            title={isCopyTrading ? t('copyTrade.active') : t('copyTrade.title')}
          >
            <Copy className="w-3 h-3" />
            {isCopyTrading ? t('copyTrade.active') : t('copyTrade.title')}
          </button>
        </div>
        <span className="text-[11px] text-text-quaternary">
          {t('community.followers')} {followerCount + (isFollowed ? 1 : 0)}
        </span>
      </div>
    </div>
  );
}

interface TradersTabProps {
  showLoginModal: (message?: string) => void;
}

/** 트레이더 탭 — 리더보드, 팔로우, 카피트레이딩 기능
 * Traders tab — leaderboard, follow, copy trade */
export default function TradersTab({ showLoginModal }: TradersTabProps) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.user);
  const { data: leaderboardData, isLoading } = useLeaderboard();

  // 실제 팔로우 훅 사용 / Use real follow hooks
  const { data: followingData } = useFollowing();
  const followTrader = useFollowTrader();
  const unfollowTrader = useUnfollowTrader();
  const followedUserIds = useMemo(() => {
    if (!followingData) return new Set<string>();
    return new Set(followingData.map((f) => f.followeeId));
  }, [followingData]);

  // 카피 트레이딩 모달 상태 / Copy trade modal state
  const [copyTradeTarget, setCopyTradeTarget] = useState<{ id: string; name: string; pnlPercent: number } | null>(null);

  const { query: { data: rateData } } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const rate = rateData?.rate;
  const fmt = (v: number) => formatCurrencyDisplay(v, currencyMode, rate);

  // 트레이더 탭: 투자자만 + 카피트레이딩만 필터 / Traders tab: invested-only + copy-trade-only filter
  const [tradersInvestedOnly, setTradersInvestedOnly] = useState(true);
  const [tradersCopyTradeOnly, setTradersCopyTradeOnly] = useState(false);

  // 카피 트레이딩 상태 / Copy trade status
  const { data: copyTradeConfigs } = useCopyTradeStatus();
  const copyTradingUserIds = useMemo(() => {
    if (!copyTradeConfigs) return new Set<string>();
    return new Set(copyTradeConfigs.filter((c) => c.isActive).map((c) => c.traderId));
  }, [copyTradeConfigs]);

  // 활성 트레이더 (투자자만/카피트레이딩만 필터) / Active traders (invested-only + copy-trade-only filter)
  const activeTraders = useMemo(() => {
    if (!leaderboardData) return [];
    let filtered = leaderboardData;
    if (tradersInvestedOnly) filtered = filtered.filter((e) => e.hasTraded);
    if (tradersCopyTradeOnly) filtered = filtered.filter((e) => copyTradingUserIds.has(e.id));
    return filtered.map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [leaderboardData, tradersInvestedOnly, tradersCopyTradeOnly, copyTradingUserIds]);

  // 트레이더 팔로워 수 일괄 조회 — anon_ ID 제외 / Batch fetch follower counts — exclude anon_ IDs
  const traderUserIds = useMemo(() => activeTraders.map((e) => e.id).filter((id) => !id.startsWith('anon_')), [activeTraders]);
  const { data: batchFollowCounts } = useBatchFollowCounts(traderUserIds);

  // 언팔로우 확인 모달 상태 / Unfollow confirm modal state
  const [unfollowTarget, setUnfollowTarget] = useState<string | null>(null);

  const toggleFollow = useCallback((userId: string) => {
    if (!isAuthenticated) {
      showLoginModal();
      return;
    }
    // 자기 자신 팔로우 불가 / Cannot follow yourself
    if (currentUser && currentUser.id === userId) return;
    // anon_ ID는 팔로우 불가 / Cannot follow anonymized IDs
    if (userId.startsWith('anon_')) return;
    if (followedUserIds.has(userId)) {
      // 언팔로우 시 확인 모달 표시 / Show confirmation before unfollow
      setUnfollowTarget(userId);
    } else {
      followTrader.mutate(userId);
    }
  }, [isAuthenticated, currentUser, followedUserIds, followTrader, showLoginModal]);

  /** 언팔로우 확인 처리 / Confirm unfollow handler */
  const confirmUnfollow = useCallback(() => {
    if (unfollowTarget) {
      unfollowTrader.mutate(unfollowTarget);
      setUnfollowTarget(null);
    }
  }, [unfollowTarget, unfollowTrader]);

  return (
    <div>
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

      {/* 투자자만 필터 + 참여자 수 / Invested-only filter + participant count */}
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <div className="relative">
            <input
              type="checkbox"
              checked={tradersInvestedOnly}
              onChange={(e) => setTradersInvestedOnly(e.target.checked)}
              className="peer sr-only"
            />
            <div className="w-[34px] h-[18px] rounded-full bg-border peer-checked:bg-accent transition-colors" />
            <div className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-[16px]" />
          </div>
          <span className="text-[12px] font-medium text-text-tertiary group-hover:text-text-secondary transition-colors">{t('community.investedOnly')}</span>
        </label>
        {isAuthenticated && (
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <div className="relative">
              <input
                type="checkbox"
                checked={tradersCopyTradeOnly}
                onChange={(e) => setTradersCopyTradeOnly(e.target.checked)}
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
          <span>{activeTraders.length}{t('community.tradersCount')}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-bg-tertiary" />
                <div>
                  <div className="h-4 w-20 bg-bg-tertiary rounded mb-1" />
                  <div className="h-3 w-14 bg-bg-tertiary rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-bg-tertiary rounded mb-2" />
              <div className="h-3 w-3/4 bg-bg-tertiary rounded mb-3" />
              <div className="border-t border-border/50 my-3" />
              <div className="h-8 w-20 bg-bg-tertiary rounded" />
            </div>
          ))}
        </div>
      ) : activeTraders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTraders.map((entry) => (
            <TraderCard
              key={entry.id}
              entry={entry}
              isFollowed={followedUserIds.has(entry.id)}
              isCopyTrading={copyTradingUserIds.has(entry.id)}
              followerCount={batchFollowCounts?.[entry.id] ?? 0}
              onToggleFollow={() => toggleFollow(entry.id)}
              onCopyTrade={() => {
                if (!isAuthenticated) { showLoginModal(); return; }
                // 자기 자신 카피트레이딩 방지 / Prevent self copy trading
                if (currentUser && currentUser.id === entry.id) return;
                setCopyTradeTarget({ id: entry.id, name: entry.name || entry.username || '-', pnlPercent: entry.pnlPercent });
              }}
              t={t}
              fmt={fmt}
            />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-text-quaternary text-[14px]">
          {t('community.noStrategies')}
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
