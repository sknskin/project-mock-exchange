/**
 * @file 커뮤니티 페이지
 * @description 자유게시판(실제 API), 전략 공유(실제 API), 트레이더 랭킹을 보여주는 소셜/커뮤니티 페이지
 *
 * @file Community Page
 * @description Community page with real discussion board, real strategy sharing, and trader rankings
 */
'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Pagination from '@/components/ui/Pagination';
import LoginRequiredModal from '@/components/ui/LoginRequiredModal';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn, formatPercent, formatCurrencyDisplay } from '@/lib/format';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useCommunityPosts } from '@/hooks/useCommunity';
import { useFollowing, useFollowTrader, useUnfollowTrader, useBatchFollowCounts } from '@/hooks/useFollow';
import { useStrategies, useLikeStrategy } from '@/hooks/useStrategy';
import ActivityFeed from '@/components/trading/ActivityFeed';
import CopyTradeModal from '@/components/trading/CopyTradeModal';
import {
  Users,
  TrendingUp,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  Trophy,
  AlertTriangle,
  MessageSquare,
  PenSquare,
  Clock,
  ThumbsUp,
  Eye,
  Search,
  Paperclip,
  Lock,
  Copy,
  X,
} from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';
import type { LeaderboardEntry, CommunityStrategy } from '@/types';

/* ───────── 상수 / Constants ───────── */

const SYMBOLS = ['BTC', 'ETH', 'AAPL', 'TSLA', 'SOL', 'NVDA', 'AMZN', 'DOGE', 'XRP', 'GOOG'];

/* ───────── 전략 카드 컴포넌트 / Strategy Card Component ───────── */

/** 전략 카드 — 실제 전략의 종목/수익률/좋아요/댓글 표시
 * Strategy card — displays real strategy symbol, return, likes, comments */
function StrategyCard({
  strategy,
  locale,
  onClick,
  onLike,
}: {
  strategy: CommunityStrategy;
  locale: 'ko' | 'en';
  onClick: () => void;
  onLike: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 hover:border-accent/30 transition-all cursor-pointer"
    >
      {/* Top: 작성자 + 종목 / author + symbol */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
            <span className="text-[12px] font-bold text-accent">
              {strategy.authorName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-[13px] font-semibold text-text-primary truncate">
            {strategy.authorName}
          </span>
        </div>
        <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-accent/10 text-accent shrink-0">
          {strategy.symbol}
        </span>
      </div>

      {/* 전략 정보 / Strategy info */}
      <div className="mb-3">
        <h3 className="text-[14px] font-bold text-text-primary mb-1 line-clamp-1">
          {strategy.title}
        </h3>
        <p className="text-[12px] text-text-tertiary line-clamp-2 leading-relaxed">
          {strategy.description}
        </p>
      </div>

      {/* 구분선 / Divider */}
      <div className="border-t border-border/50 my-3" />

      {/* 하단: 수익률 + 통계 / Bottom: performance + stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {strategy.performance != null && (
            <span
              className={cn(
                'flex items-center gap-1 text-[13px] font-bold tabular-nums',
                strategy.performance >= 0 ? 'text-rise' : 'text-fall',
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              {strategy.performance >= 0 ? '+' : ''}
              {strategy.performance}%
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onLike(); }}
            className="flex items-center gap-1 text-[12px] text-text-quaternary hover:text-rise transition-colors"
          >
            <Heart
              className={cn('w-3.5 h-3.5', strategy.liked && 'fill-rise text-rise')}
            />
            <span className="tabular-nums">{strategy.likeCount}</span>
          </button>
          <span className="flex items-center gap-1 text-[12px] text-text-quaternary">
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="tabular-nums">{strategy.commentCount}</span>
          </span>
        </div>
        <span className="text-[11px] text-text-quaternary">
          {timeAgo(strategy.createdAt, locale)}
        </span>
      </div>
    </div>
  );
}

/* ───────── 트레이더 카드 컴포넌트 / Trader Card Component ───────── */

/** 트레이더 카드 — 리더보드 기반 트레이더 정보 + 팔로우 기능
 * Trader card — leaderboard-based trader info + follow toggle */
function TraderCard({
  entry,
  isFollowed,
  followerCount,
  onToggleFollow,
  onCopyTrade,
  t,
  fmt,
}: {
  entry: LeaderboardEntry;
  isFollowed: boolean;
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
          {/* 카피 트레이딩 버튼 / Copy Trade button */}
          <button
            onClick={onCopyTrade}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-bg-tertiary text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
            title={t('copyTrade.title')}
          >
            <Copy className="w-3 h-3" />
            {t('copyTrade.title')}
          </button>
        </div>
        <span className="text-[11px] text-text-quaternary">
          {t('community.followers')} {followerCount + (isFollowed ? 1 : 0)}
        </span>
      </div>
    </div>
  );
}

/* ───────── 메인 페이지 / Main Page ───────── */

const DISCUSSION_CATEGORIES = [
  { value: 'ALL', ko: '전체', en: 'All' },
  { value: 'FREE', ko: '자유토론', en: 'Discussion' },
  { value: 'INFO', ko: '정보공유', en: 'Info' },
  { value: 'QUESTION', ko: '질문', en: 'Question' },
  { value: 'STRATEGY', ko: '전략', en: 'Strategy' },
  { value: 'ANALYSIS', ko: '분석', en: 'Analysis' },
  { value: 'PROOF', ko: '인증', en: 'Proof' },
];

const CATEGORY_LABELS: Record<string, { ko: string; en: string }> = {
  FREE: { ko: '자유토론', en: 'Discussion' },
  INFO: { ko: '정보공유', en: 'Info' },
  QUESTION: { ko: '질문', en: 'Question' },
  STRATEGY: { ko: '전략', en: 'Strategy' },
  ANALYSIS: { ko: '분석', en: 'Analysis' },
  PROOF: { ko: '인증', en: 'Proof' },
};

// 상대 시간 표시 유틸 (분/시간/일) / Relative time display utility (min/hour/day)
function timeAgo(dateStr: string, locale: 'ko' | 'en'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === 'ko' ? '방금 전' : 'just now';
  if (mins < 60) return locale === 'ko' ? `${mins}분 전` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale === 'ko' ? `${hours}시간 전` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return locale === 'ko' ? `${days}일 전` : `${days}d ago`;
}

// HTML 태그 제거 유틸 (게시글 미리보기용) / Strip HTML tags utility (for post preview)
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/** Suspense 래퍼 — useSearchParams 사용을 위해 필요
 * Suspense wrapper — required for useSearchParams usage in Next.js 15 */
export default function CommunityPageWrapper() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-text-quaternary animate-pulse">Loading...</div>}>
      <CommunityPage />
    </Suspense>
  );
}

/** 커뮤니티 페이지 컴포넌트 — 자유게시판/전략 공유/트레이더 랭킹 탭
 * Community page component — discussions, strategies, and trader rankings tabs */
function CommunityPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 파라미터에서 초기 탭 결정 / Determine initial tab from URL param
  const initialTab = (() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'strategies' || tabParam === 'traders' || tabParam === 'feed') return tabParam;
    return 'discussions' as const;
  })();

  const [tab, setTabRaw] = useState<'discussions' | 'strategies' | 'traders' | 'feed'>(initialTab);
  const setTab = useCallback((v: typeof tab) => { setTabRaw(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
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

  // 로그인 필요 모달 상태 / Login required modal state
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalMessage, setLoginModalMessage] = useState<string | undefined>();

  /** 로그인 모달 표시 헬퍼 / Show login modal helper */
  const showLoginModal = useCallback((message?: string) => {
    setLoginModalMessage(message);
    setLoginModalOpen(true);
  }, []);

  // 자유게시판 상태 / Discussion board state
  const [discussionPage, setDiscussionPage] = useState(1);
  const [discussionCategory, setDiscussionCategory] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // 디바운스 검색 — 300ms 후 쿼리 적용 / Debounced search — applies query after 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setDiscussionPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const { data: postsData, isLoading: postsLoading } = useCommunityPosts(
    discussionPage,
    discussionCategory !== 'ALL' ? discussionCategory : undefined,
    searchQuery || undefined,
  );

  // 전략 상태 / Strategy state
  const [strategyPage, setStrategyPage] = useState(1);
  const [strategySymbol, setStrategySymbol] = useState('ALL');
  const { data: strategiesData, isLoading: strategiesLoading } = useStrategies(
    strategyPage,
    strategySymbol !== 'ALL' ? strategySymbol : undefined,
  );
  const likeStrategy = useLikeStrategy();

  // 활성 트레이더 (자산 > 0) / Active traders with assets > 0
  const activeTraders = useMemo(() => {
    if (!leaderboardData) return [];
    return leaderboardData
      .filter((e) => e.totalValue > 0)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [leaderboardData]);

  // 트레이더 팔로워 수 일괄 조회 — anon_ ID 제외 / Batch fetch follower counts — exclude anon_ IDs
  const traderUserIds = useMemo(() => activeTraders.map((e) => e.id).filter((id) => !id.startsWith('anon_')), [activeTraders]);
  const { data: batchFollowCounts } = useBatchFollowCounts(traderUserIds);

  /** 전략 글쓰기 자격 확인 — 수익률 5% 이상 또는 자산 상위 20%
   * Check strategy write eligibility — return rate >= 5% or top 20% assets */
  const canWriteStrategy = useMemo(() => {
    if (!isAuthenticated || !leaderboardData || leaderboardData.length === 0) return false;
    // 리더보드에서 현재 사용자 찾기 (isMe 플래그 또는 ID 매칭)
    // Find current user in leaderboard (via isMe flag or ID matching)
    const userAuth = useAuthStore.getState().user;
    const userEntry = leaderboardData.find((e) => e.isMe || (userAuth && e.id === userAuth.id));
    if (!userEntry) return false;
    // 수익률 5% 이상 / Return rate >= 5%
    if (userEntry.pnlPercent >= 5) return true;
    // 자산 상위 20% / Top 20% total assets
    const sorted = [...leaderboardData].sort((a, b) => b.totalValue - a.totalValue);
    const userIndex = sorted.findIndex((e) => e.id === userEntry.id);
    if (userIndex >= 0 && userIndex < sorted.length * 0.2) return true;
    return false;
  }, [isAuthenticated, leaderboardData]);

  /** 트레이더 팔로우/언팔로우 토글 — 실제 API 호출
   * Toggle trader follow/unfollow — real API call */
  const currentUser = useAuthStore((s) => s.user);

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
      unfollowTrader.mutate(userId);
    } else {
      followTrader.mutate(userId);
    }
  }, [isAuthenticated, currentUser, followedUserIds, followTrader, unfollowTrader, showLoginModal]);

  /** 트레이더 탭 클릭 핸들러 — 비로그인 시 로그인 모달 표시
   * Traders tab click handler — shows login modal for non-authenticated users */
  const handleTabClick = useCallback((tabKey: 'discussions' | 'strategies' | 'traders' | 'feed') => {
    if ((tabKey === 'traders' || tabKey === 'feed') && !isAuthenticated) {
      showLoginModal(t('community.tradersLoginRequired'));
      return;
    }
    setTab(tabKey);
  }, [isAuthenticated, setTab, showLoginModal, t]);

  /** 게시글 클릭 핸들러 — 회원 전용 게시글 비로그인 시 로그인 모달 표시
   * Post click handler — shows login modal for members-only posts when not logged in */
  const handlePostClick = useCallback((postId: string, visibility?: string) => {
    if (visibility === 'MEMBERS_ONLY' && !isAuthenticated) {
      showLoginModal(t('community.membersOnlyPost'));
      return;
    }
    router.push(`/community/${postId}`);
  }, [isAuthenticated, router, showLoginModal, t]);

  /** 전략 카드 클릭 핸들러 — 비로그인 시 로그인 모달, 로그인 시 상세 페이지로 이동
   * Strategy card click handler — login modal for non-auth, navigate to detail for auth */
  const handleStrategyClick = useCallback((strategyId: string) => {
    if (!isAuthenticated) {
      showLoginModal(t('community.strategyLoginRequired'));
      return;
    }
    router.push(`/community/strategy/${strategyId}`);
  }, [isAuthenticated, router, showLoginModal, t]);

  /** 전략 좋아요 토글 — 비로그인 시 로그인 모달
   * Toggle strategy like — login modal for non-auth */
  const handleStrategyLike = useCallback((strategyId: string) => {
    if (!isAuthenticated) {
      showLoginModal(t('community.strategyLoginRequired'));
      return;
    }
    likeStrategy.mutate(strategyId);
  }, [isAuthenticated, likeStrategy, showLoginModal, t]);

  /** 글쓰기 버튼 클릭 핸들러 — 비로그인 시 로그인 모달 표시
   * Write button click handler — shows login modal for non-authenticated users */
  const handleWriteClick = useCallback(() => {
    if (!isAuthenticated) {
      showLoginModal();
      return;
    }
    router.push('/community/new');
  }, [isAuthenticated, router, showLoginModal]);

  return (
      <div>
        {/* 로그인 필요 모달 / Login Required Modal */}
        <LoginRequiredModal
          isOpen={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
          message={loginModalMessage}
        />

        {/* 헤더 / Header */}
        <div className="py-6 flex items-center gap-2.5 h-[88px]">
          <Users className="w-5 h-5 text-accent" />
          <h1 className="text-[20px] font-extrabold text-text-primary">
            {t('community.title')}
          </h1>
        </div>

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

        {/* 탭 네비게이션 / Tab navigation */}
        <div className="flex items-center border-b border-border mb-5">
          {([
            { key: 'discussions' as const, label: t('community.discussions') },
            { key: 'strategies' as const, label: t('community.strategies') },
            { key: 'traders' as const, label: t('community.traders') },
            { key: 'feed' as const, label: t('feed.title') },
          ]).map((item) => (
            <button
              key={item.key}
              onClick={() => handleTabClick(item.key)}
              className={cn(
                'relative px-4 py-2.5 text-[14px] font-semibold transition-colors',
                tab === item.key
                  ? 'text-accent'
                  : 'text-text-tertiary hover:text-text-primary',
              )}
            >
              {item.label}
              {tab === item.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-t" />
              )}
            </button>
          ))}
        </div>

        {/* 자유게시판 탭 / Discussions Tab */}
        {tab === 'discussions' && (
          <div>
            {/* 카테고리 필터 + 글쓰기 / Category filter + Write button */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap gap-1.5">
                {DISCUSSION_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => { setDiscussionCategory(cat.value); setDiscussionPage(1); }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                      discussionCategory === cat.value
                        ? 'bg-accent text-white'
                        : 'bg-bg-tertiary text-text-quaternary hover:text-text-secondary',
                    )}
                  >
                    {locale === 'ko' ? cat.ko : cat.en}
                  </button>
                ))}
              </div>
              <button
                onClick={handleWriteClick}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white text-[13px] font-semibold hover:bg-accent/90 transition-colors shrink-0"
              >
                <PenSquare className="w-3.5 h-3.5" />
                {t('community.writePost')}
              </button>
            </div>

            {/* 검색 / Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('community.post.searchPlaceholder')}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-bg-secondary border border-border/50 text-[13px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/50"
              />
              {searchInput && (
                <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-text-quaternary hover:text-text-primary transition-colors" aria-label="Clear search">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 게시글 목록 / Post list */}
            {postsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 animate-pulse">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-16 bg-bg-tertiary rounded" />
                      <div className="h-3 w-20 bg-bg-tertiary rounded" />
                    </div>
                    <div className="h-4 w-3/4 bg-bg-tertiary rounded mb-1" />
                    <div className="h-3 w-1/2 bg-bg-tertiary rounded" />
                  </div>
                ))}
              </div>
            ) : (postsData?.data && postsData.data.length > 0) ? (
              <div className="space-y-3">
                {postsData.data.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => handlePostClick(post.id, post.visibility)}
                    className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 hover:border-accent/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-accent/10 text-accent shrink-0">
                            {CATEGORY_LABELS[post.category]?.[locale] ?? post.category}
                          </span>
                          {/* 회원 전용 잠금 아이콘 / Members-only lock icon */}
                          {post.visibility === 'MEMBERS_ONLY' && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-warning/10 text-warning shrink-0" title={t('community.membersOnly')}>
                              <Lock className="w-3 h-3" />
                              {t('community.membersOnly')}
                            </span>
                          )}
                          <span className="text-[12px] text-text-quaternary truncate">
                            {post.authorName}
                          </span>
                        </div>
                        <h3 className="text-[14px] font-bold text-text-primary mb-1 line-clamp-1">
                          {post.title}
                        </h3>
                        <p className="text-[12px] text-text-tertiary line-clamp-1 leading-relaxed">
                          {stripHtml(post.content)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
                      <span className="flex items-center gap-1 text-[12px] text-text-quaternary">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="tabular-nums">{post._count?.likes ?? post.likeCount ?? 0}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[12px] text-text-quaternary">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="tabular-nums">{post._count?.comments ?? post.commentCount ?? 0}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[12px] text-text-quaternary">
                        <Eye className="w-3.5 h-3.5" />
                        <span className="tabular-nums">{post.viewCount}</span>
                      </span>
                      {(post.attachmentCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-[12px] text-text-quaternary">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="tabular-nums">{post.attachmentCount}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[12px] text-text-quaternary ml-auto">
                        <Clock className="w-3 h-3" />
                        {timeAgo(post.createdAt, locale)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center text-text-quaternary text-[14px]">
                {t('community.post.noPosts')}
              </div>
            )}

            {/* 페이지네이션 / Pagination */}
            {postsData && postsData.totalPages > 1 && (
              <Pagination
                page={discussionPage}
                totalPages={postsData.totalPages}
                total={postsData.total}
                limit={postsData.limit}
                onPageChange={setDiscussionPage}
              />
            )}
          </div>
        )}

        {/* 전략 공유 탭 / Strategies Tab */}
        {tab === 'strategies' && (
          <div>
            {/* 종목 필터 + 전략 글쓰기 버튼 / Symbol filter + Strategy write button */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => { setStrategySymbol('ALL'); setStrategyPage(1); }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                    strategySymbol === 'ALL'
                      ? 'bg-accent text-white'
                      : 'bg-bg-tertiary text-text-quaternary hover:text-text-secondary',
                  )}
                >
                  {t('strategy.allSymbols')}
                </button>
                {SYMBOLS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStrategySymbol(s); setStrategyPage(1); }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                      strategySymbol === s
                        ? 'bg-accent text-white'
                        : 'bg-bg-tertiary text-text-quaternary hover:text-text-secondary',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    showLoginModal();
                    return;
                  }
                  // 자격 미충족 시 비활성 상태 — 클릭해도 동작하지 않음
                  // If criteria not met, button is disabled — click does nothing
                  if (!canWriteStrategy) return;
                  router.push('/community/strategy/new');
                }}
                disabled={isAuthenticated && !canWriteStrategy}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-colors shrink-0',
                  isAuthenticated && !canWriteStrategy
                    ? 'bg-bg-tertiary text-text-quaternary cursor-not-allowed'
                    : 'bg-accent text-white hover:bg-accent/90',
                )}
                title={isAuthenticated && !canWriteStrategy ? t('community.strategyWriteRestriction') : undefined}
              >
                <PenSquare className="w-3.5 h-3.5" />
                {t('community.strategyWriteButton')}
              </button>
            </div>

            {strategiesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 animate-pulse"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-bg-tertiary" />
                      <div className="h-4 w-24 bg-bg-tertiary rounded" />
                    </div>
                    <div className="h-4 w-full bg-bg-tertiary rounded mb-2" />
                    <div className="h-3 w-3/4 bg-bg-tertiary rounded mb-3" />
                    <div className="border-t border-border/50 my-3" />
                    <div className="h-3 w-1/2 bg-bg-tertiary rounded" />
                  </div>
                ))}
              </div>
            ) : (strategiesData?.data && strategiesData.data.length > 0) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {strategiesData.data.map((strategy) => (
                  <StrategyCard
                    key={strategy.id}
                    strategy={strategy}
                    locale={locale}
                    onClick={() => handleStrategyClick(strategy.id)}
                    onLike={() => handleStrategyLike(strategy.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-24 text-center text-text-quaternary text-[14px]">
                {t('strategy.empty')}
              </div>
            )}

            {/* 전략 페이지네이션 / Strategy Pagination */}
            {strategiesData && strategiesData.totalPages > 1 && (
              <Pagination
                page={strategyPage}
                totalPages={strategiesData.totalPages}
                total={strategiesData.total}
                limit={strategiesData.limit}
                onPageChange={setStrategyPage}
              />
            )}

            {/* 전략 글쓰기 제한 안내 / Strategy write restriction notice */}
            <div className="flex items-center gap-2 px-3 py-2 mt-4 rounded-lg bg-bg-secondary/60 border border-border/40">
              <AlertTriangle className="w-3.5 h-3.5 text-text-quaternary shrink-0" />
              <span className="text-[12px] text-text-tertiary">
                {t('community.strategyWriteRestriction')}
              </span>
            </div>
          </div>
        )}

        {/* 트레이더 탭 / Traders Tab */}
        {tab === 'traders' && (
          <div>
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
                    followerCount={batchFollowCounts?.[entry.id] ?? 0}
                    onToggleFollow={() => toggleFollow(entry.id)}
                    onCopyTrade={() => {
                      if (!isAuthenticated) { showLoginModal(); return; }
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
          </div>
        )}

        {/* 활동 피드 탭 / Activity Feed Tab */}
        {tab === 'feed' && (
          <ActivityFeed />
        )}
      </div>
  );
}
