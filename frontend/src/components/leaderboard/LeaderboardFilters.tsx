/**
 * @file 리더보드 필터 컴포넌트
 * @description 기간, 정렬, 투자자 필터 등 리더보드 필터 UI를 분리한 서브 컴포넌트
 *
 * @file Leaderboard Filters Component
 * @description Sub-component extracting leaderboard filter UI: period, sort, investor filters
 *
 * BD-M-02: 리더보드 페이지 639줄에서 필터 영역을 분리하여 유지보수성 향상
 * BD-M-02: Extracted filter section from 639-line leaderboard page for better maintainability
 */
'use client';

import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import { Users, Trophy } from 'lucide-react';
import type { LeaderboardPeriod, LeaderboardSortBy } from '@/hooks/useLeaderboard';

interface LeaderboardFiltersProps {
  /** 기간 필터 값 / Period filter value */
  period: LeaderboardPeriod;
  /** 기간 변경 콜백 / Period change callback */
  onPeriodChange: (v: LeaderboardPeriod) => void;
  /** 정렬 기준 / Sort mode */
  sortMode: LeaderboardSortBy;
  /** 정렬 변경 콜백 / Sort change callback */
  onSortModeChange: (v: LeaderboardSortBy) => void;
  /** 투자 경험 있는 사용자만 표시 / Show only users who traded */
  investedOnly: boolean;
  /** 투자 필터 변경 콜백 / Invested filter change callback */
  onInvestedOnlyChange: (v: boolean) => void;
  /** 카피트레이딩 대상만 표시 / Show only copy-trade targets */
  copyTradeOnly: boolean;
  /** 카피트레이딩 필터 변경 콜백 / Copy trade filter change callback */
  onCopyTradeOnlyChange: (v: boolean) => void;
  /** 인증 여부 / Authentication status */
  isAuthenticated: boolean;
  /** 필터 적용 후 참여자 수 / Participant count after filters */
  participantCount: number;
  /** 현재 사용자 순위 (없으면 undefined) / Current user rank (undefined if not found) */
  myRank?: number;
}

export default function LeaderboardFilters({
  period,
  onPeriodChange,
  sortMode,
  onSortModeChange,
  investedOnly,
  onInvestedOnlyChange,
  copyTradeOnly,
  onCopyTradeOnlyChange,
  isAuthenticated,
  participantCount,
  myRank,
}: LeaderboardFiltersProps) {
  const { t } = useTranslation();

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

  return (
    <>
      {/* 기간 필터 탭 / Period filter tabs */}
      <div className="flex items-center border-b border-border mb-5 overflow-x-auto scrollbar-hide">
        {periodTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onPeriodChange(tab.key as LeaderboardPeriod)}
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

      {/* 참여자 수 + 내 순위 + 정렬 / Participants + My Rank + Sort */}
      <div className="flex items-center justify-between gap-4 pb-3 flex-wrap overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <div className="relative">
              <input
                type="checkbox"
                checked={investedOnly}
                onChange={(e) => onInvestedOnlyChange(e.target.checked)}
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
                  onChange={(e) => onCopyTradeOnlyChange(e.target.checked)}
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
            <span>{t('leaderboard.participants')} {participantCount}</span>
          </div>
          {myRank !== undefined && (
            <div className="flex items-center gap-1.5 text-[12px] text-accent font-medium">
              <Trophy className="w-3.5 h-3.5" />
              <span>{t('leaderboard.myRank')} #{myRank}</span>
            </div>
          )}
        </div>
        {/* 정렬 기준 탭 / Sort criteria tabs */}
        <div className="flex items-center gap-1 bg-bg-secondary border border-border rounded-xl p-1 shrink-0">
          {sortTabs.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onSortModeChange(opt.key as LeaderboardSortBy)}
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
    </>
  );
}
