/**
 * @file 활동 피드 컴포넌트
 * @description 팔로우 중인 트레이더의 거래 활동을 카드 형태로 표시합니다
 *
 * @file Activity Feed Component
 * @description Displays followed traders' trade activities in a card-based layout
 */
'use client';

import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import { Activity, ArrowDownLeft, ArrowUpRight, Users } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import Link from 'next/link';
import { useState } from 'react';

/**
 * 날짜를 상대 시간 문자열로 변환 (예: "2분 전")
 * Convert date to relative time string (e.g., "2m ago")
 */
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

/**
 * 활동 피드 컴포넌트 — 팔로우 중인 트레이더의 거래 활동 목록
 * Activity feed component — list of trade activities from followed traders
 */
export default function ActivityFeed() {
  const { t, locale } = useTranslation();
  const [page, setPage] = useState(1);
  const { data: feedData, isLoading } = useActivityFeed(page);

  const activities = feedData?.data ?? [];

  return (
    <div>
      {/* 제목 / Title */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-accent" />
        <h2 className="text-[16px] font-bold text-text-primary">{t('feed.title')}</h2>
      </div>

      {/* 로딩 스켈레톤 / Loading skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-bg-tertiary" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-bg-tertiary rounded mb-1" />
                  <div className="h-3 w-48 bg-bg-tertiary rounded" />
                </div>
                <div className="h-3 w-16 bg-bg-tertiary rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((activity) => {
            const isBuy = activity.side === 'BUY';
            const displayName = activity.name || activity.username || '-';

            return (
              <div
                key={activity.id}
                className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 hover:border-accent/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  {/* 아바타 / Avatar */}
                  <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
                    <span className="text-[12px] font-bold text-accent">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* 활동 정보 / Activity info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-semibold text-text-primary truncate">
                        {displayName}
                      </span>
                      <span
                        className={cn(
                          'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold',
                          isBuy
                            ? 'bg-rise/10 text-rise'
                            : 'bg-fall/10 text-fall',
                        )}
                      >
                        {isBuy ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownLeft className="w-3 h-3" />
                        )}
                        {isBuy ? t('feed.bought') : t('feed.sold')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-text-tertiary">
                      <span className="font-medium text-text-secondary">{activity.symbol}</span>
                      <span className="text-text-quaternary">|</span>
                      <span>{isBuy ? t('feed.buyExecuted') : t('feed.sellExecuted')}</span>
                    </div>
                  </div>

                  {/* 시간 / Time */}
                  <span className="text-[11px] text-text-quaternary shrink-0">
                    {timeAgo(activity.createdAt, locale)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 빈 상태 / Empty state */
        <div className="py-16 text-center">
          <Users className="w-8 h-8 text-text-quaternary mx-auto mb-3" />
          <p className="text-text-quaternary text-[14px] mb-1">
            {t('feed.empty')}
          </p>
          <p className="text-text-quaternary text-[13px] mb-4">
            {t('feed.emptyHint')}
          </p>
          <Link
            href="/community?tab=traders"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-[13px] font-semibold hover:bg-accent/90 transition-colors"
          >
            {t('feed.goToTraders')}
          </Link>
        </div>
      )}

      {/* 페이지네이션 / Pagination */}
      {feedData && feedData.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={feedData.totalPages}
          total={feedData.total}
          limit={feedData.limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
