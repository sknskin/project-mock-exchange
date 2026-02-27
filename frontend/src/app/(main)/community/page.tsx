/**
 * @file 커뮤니티 페이지
 * @description 전략 공유와 트레이더 랭킹을 보여주는 소셜/커뮤니티 페이지
 *              백엔드 미구현 상태이므로 리더보드 데이터와 모의 데이터를 활용합니다
 *
 * @file Community Page
 * @description Social/community page showing strategy sharing and trader rankings
 *              Uses leaderboard data and mock data since backend is not yet implemented
 */
'use client';

import { useState, useMemo } from 'react';
import AuthGuard from '@/components/layout/AuthGuard';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useTranslation } from '@/hooks/useTranslation';
import { cn, formatPercent, formatCurrencyDisplay } from '@/lib/format';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import {
  Users,
  TrendingUp,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  Trophy,
  AlertTriangle,
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

/* ───────── 시드 기반 의사 난수 / Seed-based pseudo-random ───────── */

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

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
    const seed = hashString(user.userId + i.toString());
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
    const seed = hashString(entry.userId);
    return Math.floor(seededRandom(seed + 100) * 300) + 10;
  }, [entry.userId]);

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

export default function CommunityPage() {
  const { t, locale } = useTranslation();
  const [tab, setTab] = useState<'strategies' | 'traders'>('strategies');
  const { data: leaderboardData, isLoading } = useLeaderboard();
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const { data: rateData } = useExchangeRate();
  const { display: currencyMode } = useCurrencyDisplay();
  const rate = rateData?.rate;
  const fmt = (v: number) => formatCurrencyDisplay(v, currencyMode, rate);

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
        <div className="py-6 flex items-center gap-2.5">
          <Users className="w-5 h-5 text-accent" />
          <h1 className="text-[20px] font-extrabold text-text-primary">
            {t('community.title')}
          </h1>
        </div>

        {/* 개발 중 안내 배너 / Development notice banner */}
        <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-warning/10">
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
          <span className="text-[12px] text-warning">
            {t('community.mockNotice')}
          </span>
        </div>

        {/* 탭 네비게이션 / Tab navigation */}
        <div className="flex items-center gap-1 bg-bg-secondary border border-border rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab('strategies')}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors',
              tab === 'strategies'
                ? 'bg-accent text-white'
                : 'text-text-quaternary hover:text-text-secondary',
            )}
          >
            {t('community.strategies')}
          </button>
          <button
            onClick={() => setTab('traders')}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors',
              tab === 'traders'
                ? 'bg-accent text-white'
                : 'text-text-quaternary hover:text-text-secondary',
            )}
          >
            {t('community.traders')}
          </button>
        </div>

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
                    key={entry.userId}
                    entry={entry}
                    isFollowed={followedUsers.has(entry.userId)}
                    onToggleFollow={() => toggleFollow(entry.userId)}
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
