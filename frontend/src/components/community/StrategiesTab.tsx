/**
 * @file 전략 공유 탭 컴포넌트
 * @description 커뮤니티 페이지의 전략 공유 탭 UI
 *
 * @file Strategies Tab Component
 * @description Community page strategies tab UI — extracted from community page for code splitting
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import Pagination from '@/components/ui/Pagination';
import { useTranslation } from '@/hooks/useTranslation';
import { cn, formatRelativeTime } from '@/lib/format';
import { useStrategies, useLikeStrategy } from '@/hooks/useStrategy';
import {
  TrendingUp,
  Heart,
  MessageCircle,
  AlertTriangle,
  PenSquare,
  Search,
} from 'lucide-react';
import type { CommunityStrategy } from '@/types';

// 상대 시간 표시 / Relative time display
const timeAgo = formatRelativeTime;

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
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      role="button"
      tabIndex={0}
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

interface StrategiesTabProps {
  isAuthenticated: boolean;
  canWriteStrategy: boolean;
  onStrategyClick: (strategyId: string) => void;
  /** 비로그인 시 호출 — 인증 가드 역할만 수행, 실제 좋아요는 내부에서 처리
   * Called when non-authenticated — only serves as auth guard, actual like handled internally */
  onStrategyLike: (strategyId: string) => void;
  onWriteClick: () => void;
}

/** 전략 공유 탭 — 전략 목록, 필터, 검색, 글쓰기 기능
 * Strategies tab — strategy list, filters, search, write */
export default function StrategiesTab({
  isAuthenticated,
  canWriteStrategy,
  onStrategyClick,
  onStrategyLike,
  onWriteClick,
}: StrategiesTabProps) {
  const { t, locale } = useTranslation();

  // 전략 상태 / Strategy state
  const [strategyPage, setStrategyPage] = useState(1);
  const [strategySymbol, setStrategySymbol] = useState('ALL');
  const [strategySearch, setStrategySearch] = useState('');
  const [strategySearchQuery, setStrategySearchQuery] = useState('');
  const strategyDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // 전략 검색 디바운스 / Strategy search debounce
  useEffect(() => {
    if (strategyDebounceRef.current) clearTimeout(strategyDebounceRef.current);
    strategyDebounceRef.current = setTimeout(() => {
      setStrategySearchQuery(strategySearch);
      setStrategyPage(1);
    }, 300);
    return () => { if (strategyDebounceRef.current) clearTimeout(strategyDebounceRef.current); };
  }, [strategySearch]);

  const { data: strategiesData, isLoading: strategiesLoading } = useStrategies(
    strategyPage,
    strategySymbol !== 'ALL' ? strategySymbol : undefined,
    strategySearchQuery || undefined,
  );
  const likeStrategy = useLikeStrategy();

  return (
    <div>
      {/* 카테고리 필터 + 검색 + 전략 글쓰기 버튼 / Category filter + Search + Strategy write button */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {([
              { key: 'ALL', label: t('strategy.allSymbols') },
              { key: 'CRYPTO', label: t('community.strategyCrypto') },
              { key: 'STOCK_KR', label: t('community.strategyStockKR') },
              { key: 'STOCK_US', label: t('community.strategyStockUS') },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setStrategySymbol(key); setStrategyPage(1); }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                  strategySymbol === key
                    ? 'bg-accent text-white'
                    : 'bg-bg-tertiary text-text-tertiary hover:text-text-secondary',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        <button
          onClick={onWriteClick}
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

        {/* 전략 검색 / Strategy search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-quaternary" />
          <input
            type="text"
            value={strategySearch}
            onChange={(e) => setStrategySearch(e.target.value)}
            placeholder={t('community.strategySearchPlaceholder')}
            maxLength={100}
            className="w-full pl-9 pr-3.5 py-2.5 bg-bg-secondary rounded-xl text-[13px] text-text-primary placeholder:text-text-quaternary outline-none focus:ring-1 focus:ring-accent/30"
          />
        </div>
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
              onClick={() => onStrategyClick(strategy.id)}
              onLike={() => {
                if (!isAuthenticated) { onStrategyLike(strategy.id); return; }
                likeStrategy.mutate(strategy.id);
              }}
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
  );
}
