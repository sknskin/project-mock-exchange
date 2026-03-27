/**
 * @file 리더보드 사용자 프로필 모달
 * @description 리더보드에서 사용자를 클릭하면 표시되는 프로필 모달
 *
 * @file Leaderboard User Profile Modal
 * @description Profile modal shown when clicking a user on the leaderboard
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useScrollLock } from '@/hooks/useScrollLock';
import { usePublicPortfolio } from '@/hooks/usePortfolio';
import { cn, formatCurrencyDisplay, formatPercent } from '@/lib/format';
import {
  X,
  Trophy,
  TrendingUp,
  TrendingDown,
  UserPlus,
  UserCheck,
  Copy,
  Briefcase,
} from 'lucide-react';

/** 모달에 전달되는 사용자 데이터 / User data passed to the modal */
export interface UserProfileData {
  id: string;
  name: string;
  username: string;
  rank: number;
  totalValue: number;
  pnlPercent: number;
  isMe: boolean;
}

interface UserProfileModalProps {
  /** 표시할 사용자 데이터 (null이면 미표시) / User data to display (null = hidden) */
  user: UserProfileData | null;
  /** 닫기 콜백 / Close callback */
  onClose: () => void;
  /** 팔로우 여부 / Whether the user is followed */
  isFollowed: boolean;
  /** 카피트레이딩 중 여부 / Whether copy trading is active */
  isCopyTrading: boolean;
  /** 팔로우 토글 핸들러 / Follow toggle handler */
  onToggleFollow: (userId: string) => void;
  /** 카피트레이딩 설정 핸들러 / Copy trade handler */
  onCopyTrade: (user: { id: string; name: string; pnlPercent: number }) => void;
  /** 인증 여부 / Whether the user is authenticated */
  isAuthenticated: boolean;
}

/** 절대 수익 계산 / Calculate absolute PnL from totalValue and pnlPercent */
function calcAbsolutePnl(totalValue: number, pnlPercent: number): number {
  if (pnlPercent === 0) return 0;
  const initialCapital = totalValue / (1 + pnlPercent / 100);
  return totalValue - initialCapital;
}

export default function UserProfileModal({
  user,
  onClose,
  isFollowed,
  isCopyTrading,
  onToggleFollow,
  onCopyTrade,
  isAuthenticated,
}: UserProfileModalProps) {
  const { t } = useTranslation();
  const { query: { data: rateData } } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const rate = rateData?.rate;
  const fmt = (v: number) => formatCurrencyDisplay(v, currencyMode, rate);

  const isOpen = !!user;
  const { data: publicPortfolio, isLoading: isPortfolioLoading } = usePublicPortfolio(user?.id ?? '');
  useScrollLock(isOpen);

  const modalRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기 / Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // 모달 열릴 때 포커스 이동 / Focus modal on open
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  // 배경 클릭 핸들러 / Backdrop click handler
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!user) return null;

  const absolutePnl = calcAbsolutePnl(user.totalValue, user.pnlPercent);
  const isPositive = user.pnlPercent >= 0;
  const displayName = user.name || user.username || '-';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={t('leaderboard.profile.title')}
    >
      {/* 배경 오버레이 / Background overlay */}
      <div
        className="absolute inset-0 bg-black/60 animate-modal-backdrop"
        onClick={handleBackdropClick}
      />

      {/* 모달 콘텐츠 / Modal content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-bg-primary border border-border rounded-2xl p-6 w-[400px] max-w-[calc(100vw-2rem)] max-h-[90dvh] overflow-y-auto shadow-2xl animate-modal-content outline-none"
      >
        {/* 닫기 버튼 / Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-text-quaternary hover:text-text-primary transition-colors"
          aria-label={t('leaderboard.profile.close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* 사용자 아바타 + 이름 + 순위 / User avatar + name + rank */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-[20px] font-bold',
              user.rank === 1 && 'bg-yellow-400/15 border-2 border-yellow-400/40 text-yellow-400',
              user.rank === 2 && 'bg-gray-400/15 border-2 border-gray-400/40 text-gray-400',
              user.rank === 3 && 'bg-amber-600/15 border-2 border-amber-600/40 text-amber-600',
              user.rank > 3 && 'bg-accent/15 border-2 border-accent/30 text-accent',
            )}
          >
            {avatarLetter}
          </div>
          <div className="min-w-0">
            <h2 className="text-[18px] font-bold text-text-primary truncate">
              {displayName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Trophy className="w-3.5 h-3.5 text-text-tertiary" />
              <span className="text-[13px] text-text-tertiary font-medium">
                #{user.rank}
              </span>
              {user.isMe && (
                <span className="text-[11px] text-accent font-medium bg-accent/10 px-1.5 py-0.5 rounded">(me)</span>
              )}
            </div>
          </div>
        </div>

        {/* 통계 카드 / Stats cards */}
        <div className="space-y-3 mb-6">
          {/* 총 자산 / Total Assets */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-secondary border border-border/50">
            <span className="text-[13px] text-text-tertiary font-medium">
              {t('leaderboard.profile.totalAssets')}
            </span>
            <span className="text-[15px] font-bold text-text-primary tabular-nums">
              {fmt(user.totalValue)}
            </span>
          </div>

          {/* 수익률 / Return Rate */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-secondary border border-border/50">
            <span className="text-[13px] text-text-tertiary font-medium">
              {t('leaderboard.profile.returnRate')}
            </span>
            <span
              className={cn(
                'flex items-center gap-1.5 text-[15px] font-bold tabular-nums',
                isPositive ? 'text-rise' : 'text-fall',
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {formatPercent(user.pnlPercent)}
            </span>
          </div>

          {/* 손익 금액 / PnL Amount */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-secondary border border-border/50">
            <span className="text-[13px] text-text-tertiary font-medium">
              {t('leaderboard.profile.pnlAmount')}
            </span>
            <span
              className={cn(
                'text-[15px] font-bold tabular-nums',
                absolutePnl >= 0 ? 'text-rise' : 'text-fall',
              )}
            >
              {absolutePnl >= 0 ? '+' : ''}
              {fmt(absolutePnl)}
            </span>
          </div>
        </div>

        {/* 보유 종목 / Holdings section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-text-tertiary" />
            <span className="text-[14px] font-semibold text-text-primary">
              {t('leaderboard.profile.holdings')}
            </span>
          </div>

          {isPortfolioLoading ? (
            /* 로딩 스켈레톤 / Loading skeleton */
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[52px] rounded-xl bg-bg-secondary border border-border/50 animate-pulse"
                />
              ))}
            </div>
          ) : !publicPortfolio?.holdings?.length ? (
            /* 빈 상태 / Empty state */
            <div className="py-6 text-center text-[13px] text-text-quaternary rounded-xl bg-bg-secondary border border-border/50">
              {t('leaderboard.profile.holdingsEmpty')}
            </div>
          ) : (
            /* 보유 종목 목록 (스크롤) / Holdings list (scrollable) */
            <div className="max-h-[200px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {publicPortfolio.holdings.map((holding) => {
                const qty = parseFloat(holding.quantity);
                const avgPrice = parseFloat(holding.avgPrice);
                const currentValue = parseFloat(holding.currentValue);
                const pnl = parseFloat(holding.pnlPercent);
                const isPnlPositive = pnl >= 0;

                return (
                  <div
                    key={holding.symbol}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-bg-secondary border border-border/50"
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-text-primary truncate">
                        {holding.symbol}
                      </div>
                      <div className="text-[11px] text-text-quaternary tabular-nums">
                        {qty.toLocaleString(undefined, { maximumFractionDigits: 4 })} @ {fmt(avgPrice)}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-[13px] font-semibold text-text-primary tabular-nums">
                        {fmt(currentValue)}
                      </div>
                      <div
                        className={cn(
                          'text-[11px] font-medium tabular-nums',
                          isPnlPositive ? 'text-rise' : 'text-fall',
                        )}
                      >
                        {isPnlPositive ? '+' : ''}
                        {formatPercent(pnl)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 액션 버튼 (인증 시, 본인 제외) / Action buttons (auth, not self) */}
        {isAuthenticated && !user.isMe && (
          <div className="flex gap-3">
            {/* 팔로우/언팔로우 버튼 / Follow/Unfollow button */}
            <button
              onClick={() => onToggleFollow(user.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-[14px] font-semibold transition-colors',
                isFollowed
                  ? 'bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20'
                  : 'bg-bg-secondary text-text-primary border border-border hover:bg-bg-tertiary',
              )}
            >
              {isFollowed ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  {t('leaderboard.profile.unfollow')}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {t('leaderboard.profile.follow')}
                </>
              )}
            </button>

            {/* 카피 트레이딩 버튼 / Copy Trade button */}
            <button
              onClick={() =>
                onCopyTrade({
                  id: user.id,
                  name: displayName,
                  pnlPercent: user.pnlPercent,
                })
              }
              className={cn(
                'flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-[14px] font-semibold transition-colors',
                isCopyTrading
                  ? 'bg-accent text-white hover:bg-accent/90'
                  : 'bg-accent text-white hover:bg-accent/90',
              )}
            >
              <Copy className="w-4 h-4" />
              {t('leaderboard.profile.copyTrade')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
