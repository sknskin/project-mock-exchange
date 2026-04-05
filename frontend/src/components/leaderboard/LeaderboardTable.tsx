/**
 * @file 리더보드 테이블 컴포넌트
 * @description 리더보드 순위 행을 렌더링하는 서브 컴포넌트 (헤더 + 행 목록)
 *
 * @file Leaderboard Table Component
 * @description Sub-component rendering leaderboard rank rows (header + row list)
 *
 * BD-M-02: 리더보드 페이지에서 테이블 렌더링 영역을 분리
 * BD-M-02: Extracted table rendering from leaderboard page
 */
'use client';

import { useRef, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
// cn, formatPercent removed — unused in this component
import Skeleton from '@/components/ui/Skeleton';
import LeaderboardCard from './LeaderboardCard';
import type { LeaderboardSortBy } from '@/hooks/useLeaderboard';

// 리더보드 엔트리 타입 (부모에서 전달) / Leaderboard entry type (passed from parent)
export interface LeaderboardEntry {
  id: string;
  rank: number;
  name?: string;
  username?: string;
  totalValue: number;
  pnlPercent: number;
  isMe: boolean;
  hasTraded: boolean;
}

const ROW_HEIGHT = 56;

interface LeaderboardTableProps {
  /** 정렬된 리더보드 데이터 / Sorted leaderboard data */
  entries: LeaderboardEntry[];
  /** 로딩 상태 / Loading state */
  isLoading: boolean;
  /** 정렬 기준 / Sort mode */
  sortMode: LeaderboardSortBy;
  /** 인증 여부 / Authentication status */
  isAuthenticated: boolean;
  /** 팔로우 중인 사용자 ID 집합 / Set of followed user IDs */
  followedUserIds: Set<string>;
  /** 카피트레이딩 중인 사용자 ID 집합 / Set of copy-trading user IDs */
  copyTradingUserIds: Set<string>;
  /** 현재 사용자 ID / Current user ID */
  currentUserId?: string;
  /** 통화 포맷 함수 / Currency format function */
  fmt: (v: number) => string;
  /** 팔로우 토글 콜백 / Follow toggle callback */
  onToggleFollow: (userId: string) => void;
  /** 카피 트레이딩 시작 콜백 / Copy trade start callback */
  onCopyTrade: (target: { id: string; name: string; pnlPercent: number }) => void;
  /** 프로필 모달 열기 콜백 / Open profile modal callback */
  onOpenProfile: (entry: LeaderboardEntry) => void;
}

export default function LeaderboardTable({
  entries,
  isLoading,
  sortMode,
  isAuthenticated,
  followedUserIds,
  copyTradingUserIds,
  currentUserId,
  fmt,
  onToggleFollow,
  onCopyTrade,
  onOpenProfile,
}: LeaderboardTableProps) {
  const { t } = useTranslation();

  // 이전 순위 저장 (애니메이션용) / Previous rank storage (for animation)
  const prevRankMap = useRef<Map<string, number>>(new Map());
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // 순위 변동 FLIP 애니메이션 / Rank change FLIP animation
  useEffect(() => {
    if (!entries.length) return;
    const prev = prevRankMap.current;
    const movedEls: HTMLElement[] = [];
    entries.forEach((entry) => {
      const prevRank = prev.get(entry.id);
      if (prevRank === undefined || prevRank === entry.rank) return;
      const el = rowRefs.current.get(entry.id);
      if (!el) return;
      const delta = (prevRank - entry.rank) * ROW_HEIGHT;
      el.style.transition = 'none';
      el.style.transform = `translateY(${delta}px)`;
      movedEls.push(el);
    });
    if (movedEls.length > 0) {
      // PERF-13-16: 동기 reflow(offsetHeight) 대신 requestAnimationFrame 배치 FLIP 처리
      // PERF-13-16: Use requestAnimationFrame batch FLIP instead of synchronous reflow (offsetHeight)
      requestAnimationFrame(() => {
        movedEls.forEach((el) => {
          el.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          el.style.transform = 'translateY(0)';
        });
      });
    }
    const next = new Map<string, number>();
    entries.forEach((entry) => next.set(entry.id, entry.rank));
    prevRankMap.current = next;
  }, [entries]);

  const thirdColHeader = sortMode === 'absolute' ? t('leaderboard.absolutePnl') : t('leaderboard.totalAssets');

  return (
    <>
      {/* 테이블 헤더 / Table header */}
      <div className="flex items-center py-2.5 text-[11px] text-text-tertiary font-medium border-b border-border/80">
        <span className="w-10 sm:w-14 text-center shrink-0">{t('leaderboard.rank')}</span>
        <span className="flex-1 pl-2 min-w-0">{t('leaderboard.user')}</span>
        <span className="hidden sm:block w-36 text-right shrink-0">{thirdColHeader}</span>
        <span className="w-20 sm:w-24 text-right shrink-0">{t('leaderboard.returnRate')}</span>
        <span className="w-10 sm:w-14 text-center shrink-0"></span>
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
          {/* TODO: PERF-13-22 — 100건 이상 렌더링 시 react-virtuoso 등 가상화 라이브러리 적용 검토 */}
          {/* TODO: PERF-13-22 — Consider virtualization library (react-virtuoso) for rendering 100+ entries */}
          {entries.map((entry) => {
            const prevRank = prevRankMap.current.get(entry.id);
            const rankChange = prevRank !== undefined ? prevRank - entry.rank : 0;

            return (
              <LeaderboardCard
                key={entry.id}
                entry={entry}
                rankChange={rankChange}
                sortMode={sortMode}
                isAuthenticated={isAuthenticated}
                isFollowed={followedUserIds.has(entry.id)}
                isCopyTrading={copyTradingUserIds.has(entry.id)}
                isSelf={currentUserId === entry.id}
                fmt={fmt}
                onToggleFollow={onToggleFollow}
                onCopyTrade={onCopyTrade}
                onOpenProfile={onOpenProfile}
                ref={(el) => { if (el) rowRefs.current.set(entry.id, el); }}
              />
            );
          })}

          {entries.length === 0 && (
            <div className="py-24 text-center text-text-quaternary text-[14px]">
              {t('leaderboard.empty')}
            </div>
          )}
        </div>
      )}
    </>
  );
}
