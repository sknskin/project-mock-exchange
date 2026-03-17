/**
 * @file 활동 피드 컴포넌트
 * @description 팔로우 중인 트레이더의 거래 활동을 카드 형태로 표시합니다.
 *              카드 클릭 시 거래 상세 정보를 모달로 표시합니다.
 *
 * @file Activity Feed Component
 * @description Displays followed traders' trade activities in a card-based layout.
 *              Clicking a card shows a detail modal with full trade information.
 */
'use client';

import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useTranslation } from '@/hooks/useTranslation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';
import { cn } from '@/lib/format';
import { Activity, ArrowDownLeft, ArrowUpRight, Users, X } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { TraderActivity } from '@/types';

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
 * 거래 상세 모달 — 선택된 활동의 전체 정보를 표시
 * Trade detail modal — shows full information of the selected activity
 */
function ActivityDetailModal({
  activity,
  onClose,
}: {
  activity: TraderActivity;
  onClose: () => void;
}) {
  const { t, locale } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true);
  useScrollLock(true);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const isBuy = activity.side === 'BUY';
  const displayName = activity.name || activity.username || '-';
  const qty = Number(activity.quantity);
  const price = Number(activity.price);
  const total = qty * price;
  const exactTime = new Date(activity.createdAt).toLocaleString(
    locale === 'ko' ? 'ko-KR' : 'en-US',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
  );

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: t('feed.detail.type'),
      value: (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-bold',
            isBuy ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall',
          )}
        >
          {isBuy ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
          {isBuy ? t('feed.detail.buy') : t('feed.detail.sell')}
        </span>
      ),
    },
    {
      label: t('feed.detail.symbol'),
      value: (
        <span className="font-semibold text-text-primary">
          {activity.symbol?.replace('-USD', '') ?? '-'}
        </span>
      ),
    },
    {
      label: t('feed.detail.quantity'),
      value: (
        <span className="tabular-nums text-text-primary">
          {qty.toLocaleString(undefined, { maximumFractionDigits: 18 })}
        </span>
      ),
    },
    {
      label: t('feed.detail.price'),
      value: (
        <span className="tabular-nums text-text-primary">
          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      label: t('feed.detail.total'),
      value: (
        <span className="tabular-nums font-semibold text-text-primary">
          ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      label: t('feed.detail.tradeId'),
      value: (
        <span className="text-text-tertiary font-mono text-[11px] break-all">
          {activity.id}
        </span>
      ),
    },
    {
      label: t('feed.detail.timestamp'),
      value: <span className="tabular-nums text-text-primary">{exactTime}</span>,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-detail-title"
      ref={modalRef}
    >
      {/* 백드롭 / Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-backdrop cursor-pointer"
        onClick={onClose}
      />

      {/* 모달 콘텐츠 / Modal content */}
      <div className="relative w-full max-w-md bg-bg-primary border border-border rounded-2xl shadow-2xl overflow-hidden animate-modal-content">
        {/* 헤더 / Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2
            id="activity-detail-title"
            className="text-[16px] font-bold text-text-primary"
          >
            {t('feed.detail.title')}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 트레이더 섹션 / Trader section */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-border/60">
          <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
            <span className="text-[18px] font-bold text-accent">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-text-primary">{displayName}</p>
            <p className="text-[12px] text-text-tertiary">{t('feed.detail.trader')}</p>
          </div>
        </div>

        {/* 상세 정보 행 / Detail rows */}
        <div className="px-5 py-4 space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4">
              <span className="text-[13px] text-text-tertiary shrink-0">{row.label}</span>
              <div className="text-[13px] text-right">{row.value}</div>
            </div>
          ))}
        </div>

        {/* 푸터 / Footer */}
        <div className="flex justify-center px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-[14px] font-bold text-white bg-danger hover:bg-danger/85 rounded-lg transition-colors cursor-pointer"
          >
            {t('modal.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 활동 피드 컴포넌트 — 팔로우 중인 트레이더의 거래 활동 목록
 * Activity feed component — list of trade activities from followed traders
 */
export default function ActivityFeed() {
  const { t, locale } = useTranslation();
  const [page, setPage] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState<TraderActivity | null>(null);
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
                role="button"
                tabIndex={0}
                onClick={() => setSelectedActivity(activity)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedActivity(activity);
                  }
                }}
                className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 hover:border-accent/30 transition-all cursor-pointer"
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
                    <div className="flex items-center gap-2 text-[12px] text-text-tertiary flex-wrap">
                      <span className="font-medium text-text-secondary">{activity.symbol?.replace('-USD', '') ?? '-'}</span>
                      <span className="text-text-quaternary">|</span>
                      <span>{isBuy ? t('feed.buyExecuted') : t('feed.sellExecuted')}</span>
                      {activity.quantity && Number(activity.quantity) > 0 && (
                        <>
                          <span className="text-text-quaternary">|</span>
                          <span className="tabular-nums">{Number(activity.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                        </>
                      )}
                      {activity.price && Number(activity.price) > 0 && (
                        <>
                          <span className="text-text-quaternary">@</span>
                          <span className="tabular-nums">${Number(activity.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </>
                      )}
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

      {/* 거래 상세 모달 / Trade detail modal */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
}
