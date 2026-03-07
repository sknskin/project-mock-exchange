/**
 * @file 커뮤니티 페이지
 * @description 자유게시판(실제 API), 전략 공유, 트레이더 랭킹을 보여주는 소셜/커뮤니티 페이지
 *
 * @file Community Page
 * @description Community page with real discussion board, strategy sharing, and trader rankings
 */
'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Pagination from '@/components/ui/Pagination';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn, formatPercent, formatCurrencyDisplay } from '@/lib/format';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useCommunityPosts } from '@/hooks/useCommunity';
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
} from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';
import type { LeaderboardEntry } from '@/types';

/* ───────── 상수 / Constants ───────── */

const SYMBOLS = ['BTC', 'ETH', 'AAPL', 'TSLA', 'SOL', 'NVDA', 'AMZN', 'DOGE', 'XRP', 'GOOG'];

const STRATEGY_TITLES_KO: Record<string, string[]> = {
  BTC: ['BTC 단기 매매 전략', 'BTC 눌림목 매수 전략', 'BTC 추세 추종 전략'],
  ETH: ['ETH 스윙 트레이딩', 'ETH DCA 전략', 'ETH 저점 매수 전략'],
  AAPL: ['AAPL 실적 발표 전략', 'AAPL 배당 투자 전략'],
  TSLA: ['TSLA 변동성 매매', 'TSLA 모멘텀 전략'],
  SOL: ['SOL 에어드롭 전략', 'SOL 단기 스캘핑'],
  NVDA: ['NVDA AI 테마 매매', 'NVDA 실적 시즌 전략'],
  AMZN: ['AMZN 장기 보유 전략', 'AMZN 박스권 매매'],
  DOGE: ['DOGE 밈코인 트레이딩', 'DOGE 이벤트 매매'],
  XRP: ['XRP 급등 대응 전략', 'XRP 장기 투자'],
  GOOG: ['GOOG 가치 투자 전략', 'GOOG 분할 매수'],
};

const STRATEGY_TITLES_EN: Record<string, string[]> = {
  BTC: ['BTC Short-term Trading', 'BTC Pullback Buy Strategy', 'BTC Trend Following'],
  ETH: ['ETH Swing Trading', 'ETH DCA Strategy', 'ETH Dip Buying'],
  AAPL: ['AAPL Earnings Play', 'AAPL Dividend Strategy'],
  TSLA: ['TSLA Volatility Trade', 'TSLA Momentum Strategy'],
  SOL: ['SOL Airdrop Strategy', 'SOL Short Scalping'],
  NVDA: ['NVDA AI Theme Trading', 'NVDA Earnings Season'],
  AMZN: ['AMZN Long Hold Strategy', 'AMZN Range Trading'],
  DOGE: ['DOGE Meme Trading', 'DOGE Event Trading'],
  XRP: ['XRP Surge Response', 'XRP Long Investment'],
  GOOG: ['GOOG Value Investing', 'GOOG Dollar Cost Averaging'],
};

const DESCRIPTIONS_KO = [
  '현재가 기준 10% 하락 시 매수, 15% 상승 시 매도',
  'RSI 30 이하 진입, 70 이상 청산',
  '20일 이동평균선 돌파 시 매수',
  '볼린저 밴드 하단 터치 시 분할 매수',
  'MACD 골든크로스 시 진입',
  '주봉 기준 3주 연속 양봉 시 추격 매수',
  '전고점 돌파 시 매수, 손절 -5%',
  '월급날 정기 매수 (DCA)',
  '거래량 급증 시 단기 매매',
  '지지선 부근 반등 매수',
];

const DESCRIPTIONS_EN = [
  'Buy at 10% dip from current price, sell at 15% gain',
  'Enter when RSI below 30, exit above 70',
  'Buy on 20-day MA breakout',
  'Scale in at lower Bollinger Band touch',
  'Enter on MACD golden cross',
  'Chase buy on 3 consecutive weekly green candles',
  'Buy on previous high breakout, stop-loss -5%',
  'Regular DCA on payday',
  'Short-term trade on volume surge',
  'Buy on bounce near support level',
];

/**
 * 시드 기반 의사 난수 — 서버/클라이언트 동일한 결과를 위해 Math.random 대신 사용
 * Seed-based pseudo-random — used instead of Math.random for SSR/hydration consistency
 */

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// 문자열을 숫자로 변환하는 해시 함수 (시드 생성용) / String-to-number hash function (for seed generation)
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/* ───────── 모의 전략 데이터 생성 / Mock Strategy Data Generator ───────── */

interface MockStrategy {
  id: string;
  username: string;
  symbol: string;
  title: string;
  description: string;
  performance: number;
  likes: number;
  comments: number;
  hoursAgo: number;
}

function generateMockStrategies(
  leaderboard: LeaderboardEntry[],
  locale: 'ko' | 'en',
): MockStrategy[] {
  const strategies: MockStrategy[] = [];
  const titles = locale === 'ko' ? STRATEGY_TITLES_KO : STRATEGY_TITLES_EN;
  const descriptions = locale === 'ko' ? DESCRIPTIONS_KO : DESCRIPTIONS_EN;

  const users = leaderboard.slice(0, 10);

  for (let i = 0; i < Math.min(10, users.length); i++) {
    const user = users[i];
    const seed = hashString(user.id + i.toString());
    const symbolIndex = Math.floor(seededRandom(seed) * SYMBOLS.length);
    const symbol = SYMBOLS[symbolIndex];
    const titleOptions = titles[symbol] || titles['BTC'];
    const titleIndex = Math.floor(seededRandom(seed + 1) * titleOptions.length);
    const descIndex = Math.floor(seededRandom(seed + 2) * descriptions.length);
    const performance = parseFloat(((seededRandom(seed + 3) * 40) - 10).toFixed(1));
    const likes = Math.floor(seededRandom(seed + 4) * 120) + 5;
    const comments = Math.floor(seededRandom(seed + 5) * 30) + 1;
    const hoursAgo = Math.floor(seededRandom(seed + 6) * 48) + 1;

    strategies.push({
      id: `strategy-${i}`,
      username: user.name || user.username || `User${i + 1}`,
      symbol,
      title: titleOptions[titleIndex],
      description: descriptions[descIndex],
      performance,
      likes,
      comments,
      hoursAgo,
    });
  }

  return strategies;
}

/* ───────── 전략 카드 컴포넌트 / Strategy Card Component ───────── */

function StrategyCard({
  strategy,
  locale,
}: {
  strategy: MockStrategy;
  locale: 'ko' | 'en';
}) {
  const [liked, setLiked] = useState(false);
  const likeCount = liked ? strategy.likes + 1 : strategy.likes;

  return (
    <div className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 hover:border-accent/30 transition-all">
      {/* Top: user + symbol */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
            <span className="text-[12px] font-bold text-accent">
              {strategy.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-[13px] font-semibold text-text-primary truncate">
            {strategy.username}
          </span>
        </div>
        <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-accent/10 text-accent shrink-0">
          {strategy.symbol}
        </span>
      </div>

      {/* Strategy info */}
      <div className="mb-3">
        <h3 className="text-[14px] font-bold text-text-primary mb-1 line-clamp-1">
          {strategy.title}
        </h3>
        <p className="text-[12px] text-text-tertiary line-clamp-2 leading-relaxed">
          {strategy.description}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-border/50 my-3" />

      {/* Bottom: performance + stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => setLiked(!liked)}
            className="flex items-center gap-1 text-[12px] text-text-quaternary hover:text-rise transition-colors"
          >
            <Heart
              className={cn('w-3.5 h-3.5', liked && 'fill-rise text-rise')}
            />
            <span className="tabular-nums">{likeCount}</span>
          </button>
          <span className="flex items-center gap-1 text-[12px] text-text-quaternary">
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="tabular-nums">{strategy.comments}</span>
          </span>
        </div>
        <span className="text-[11px] text-text-quaternary">
          {strategy.hoursAgo}
          {locale === 'ko' ? '시간 전' : 'h ago'}
        </span>
      </div>
    </div>
  );
}

/* ───────── 트레이더 카드 컴포넌트 / Trader Card Component ───────── */

function TraderCard({
  entry,
  isFollowed,
  onToggleFollow,
  t,
  fmt,
}: {
  entry: LeaderboardEntry;
  isFollowed: boolean;
  onToggleFollow: () => void;
  t: (key: TranslationKey) => string;
  fmt: (v: number) => string;
}) {
  const mockFollowers = useMemo(() => {
    const seed = hashString(entry.id);
    return Math.floor(seededRandom(seed + 100) * 300) + 10;
  }, [entry.id]);

  const displayName = entry.name || entry.username || '-';

  return (
    <div className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 hover:border-accent/30 transition-all">
      {/* Avatar + Name */}
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

      {/* Stats */}
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

      {/* Divider */}
      <div className="border-t border-border/50 my-3" />

      {/* Follow button + followers */}
      <div className="flex items-center justify-between">
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
        <span className="text-[11px] text-text-quaternary">
          {t('community.followers')} {mockFollowers + (isFollowed ? 1 : 0)}
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

export default function CommunityPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [tab, setTabRaw] = useState<'discussions' | 'strategies' | 'traders'>('discussions');
  const setTab = useCallback((v: typeof tab) => { setTabRaw(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: leaderboardData, isLoading } = useLeaderboard();
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const { query: { data: rateData } } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const rate = rateData?.rate;
  const fmt = (v: number) => formatCurrencyDisplay(v, currencyMode, rate);

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

  // 모의 전략 데이터 생성 / Generate mock strategies from leaderboard
  const strategies = useMemo(() => {
    if (!leaderboardData || leaderboardData.length === 0) return [];
    return generateMockStrategies(leaderboardData, locale);
  }, [leaderboardData, locale]);

  // 활성 트레이더 (자산 > 0) / Active traders with assets > 0
  const activeTraders = useMemo(() => {
    if (!leaderboardData) return [];
    return leaderboardData
      .filter((e) => e.totalValue > 0)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [leaderboardData]);

  const toggleFollow = (userId: string) => {
    setFollowedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  return (
    <AuthGuard>
      <div>
        {/* 헤더 / Header */}
        <div className="py-6 flex items-center gap-2.5 h-[88px]">
          <Users className="w-5 h-5 text-accent" />
          <h1 className="text-[20px] font-extrabold text-text-primary">
            {t('community.title')}
          </h1>
        </div>

        {/* 개발 중 안내 배너 — 전략/트레이더 탭에만 표시 */}
        {tab !== 'discussions' && (
          <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-warning/10">
            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
            <span className="text-[12px] text-warning">
              {t('community.mockNotice')}
            </span>
          </div>
        )}

        {/* 탭 네비게이션 / Tab navigation */}
        <div className="flex items-center border-b border-border mb-5">
          {([
            { key: 'discussions' as const, label: t('community.discussions') },
            { key: 'strategies' as const, label: t('community.strategies') },
            { key: 'traders' as const, label: t('community.traders') },
          ]).map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
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
              {isAuthenticated && (
                <button
                  onClick={() => router.push('/community/new')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white text-[13px] font-semibold hover:bg-accent/90 transition-colors shrink-0"
                >
                  <PenSquare className="w-3.5 h-3.5" />
                  {t('community.writePost')}
                </button>
              )}
            </div>

            {/* 검색 / Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('community.post.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-bg-secondary border border-border/50 text-[13px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/50"
              />
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
                    onClick={() => router.push(`/community/${post.id}`)}
                    className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 hover:border-accent/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-accent/10 text-accent shrink-0">
                            {CATEGORY_LABELS[post.category]?.[locale] ?? post.category}
                          </span>
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
            {isLoading ? (
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
            ) : strategies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {strategies.map((strategy) => (
                  <StrategyCard
                    key={strategy.id}
                    strategy={strategy}
                    locale={locale}
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
                    isFollowed={followedUsers.has(entry.id)}
                    onToggleFollow={() => toggleFollow(entry.id)}
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
      </div>
    </AuthGuard>
  );
}
