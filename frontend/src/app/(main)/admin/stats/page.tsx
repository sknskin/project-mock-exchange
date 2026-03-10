/**
 * @file 관리자 통계 대시보드 페이지
 * @description 회원, 로그인, 페이지 방문, 공지사항, 거래 통계를 탭 구조로 시각화하는 관리자 전용 페이지.
 *   차트 콘텐츠는 코드 분할을 위해 별도 파일(StatsTabContent)로 추출됨.
 *
 * @file Admin Statistics Dashboard Page
 * @description Admin-only page that visualizes service-wide statistics in a tabbed layout.
 *   Chart content is extracted to StatsTabContent for code-splitting.
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, FileText, TrendingUp, Activity, ShoppingCart, MessageSquare, ClipboardList, BarChart3 } from 'lucide-react';
import {
  useStatOverview,
  useStatOverviewTrend,
  useStatRegistrations,
  useStatRegistrationsApproved,
  useStatLogins,
  useStatPageViews,
  useStatAnnouncements,
  useStatUsers,
  useStatTrading,
  useStatPopularAnnouncements,
  useStatLikes,
  useStatChat,
} from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/format';
import { CHART_COLORS } from '@/components/admin/stats/StatsShared';

// ===== 차트 탭 콘텐츠 임포트 — 코드 분할을 위해 별도 파일로 추출 / Chart tab content import — extracted to separate file for code-splitting =====
import {
  OverviewTab,
  UsersTab,
  ActivityTab,
  TradingTab,
  ContentTab,
  ChatTab,
  AuditTab,
} from '@/components/admin/stats/StatsTabContent';

// ===== 기간/일수 선택 옵션 — 통계 API의 period/days 파라미터 값 / Period/Days selector options — values for stats API period/days params =====
const PERIOD_OPTIONS = [
  { value: 'hourly', labelKey: 'stats.period.hourly' as const },
  { value: 'daily', labelKey: 'stats.period.daily' as const },
  { value: 'weekly', labelKey: 'stats.period.weekly' as const },
  { value: 'monthly', labelKey: 'stats.period.monthly' as const },
  { value: 'yearly', labelKey: 'stats.period.yearly' as const },
];

const DAYS_OPTIONS = [
  { value: 7, labelKey: 'stats.days.7' as const },
  { value: 30, labelKey: 'stats.days.30' as const },
  { value: 90, labelKey: 'stats.days.90' as const },
  { value: 365, labelKey: 'stats.days.365' as const },
];

// ===== 통계 탭 정의 — 7개 탭: 개요, 회원, 활동, 거래, 콘텐츠, 채팅, 감사 / Stats tab definitions — 7 tabs: overview, users, activity, trading, content, chat, audit =====
const STAT_TABS = [
  { key: 'overview', labelKey: 'stats.tab.overview' as const, icon: TrendingUp },
  { key: 'users', labelKey: 'stats.tab.users' as const, icon: Users },
  { key: 'activity', labelKey: 'stats.tab.activity' as const, icon: Activity },
  { key: 'trading', labelKey: 'stats.tab.trading' as const, icon: ShoppingCart },
  { key: 'content', labelKey: 'stats.tab.content' as const, icon: FileText },
  { key: 'chat', labelKey: 'stats.tab.chat' as const, icon: MessageSquare },
  { key: 'audit', labelKey: 'admin.stats.orderAudit' as const, icon: ClipboardList },
];

/** 관리자 통계 대시보드 페이지 컴포넌트 — 7개 탭으로 서비스 통계 시각화
 * Admin statistics dashboard page component — visualize service stats across 7 tabs */
export default function AdminStatsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [tab, setTabRaw] = useState('overview');
  const setTab = useCallback((v: string) => { setTabRaw(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const [period, setPeriod] = useState('daily');
  const [days, setDays] = useState(30);
  const tabsRef = useRef<HTMLDivElement>(null);

  /**
   * 탭 영역 스크롤 처리 — 수평 스와이프만 탭 스크롤로 변환, 수직은 페이지 스크롤 유지
   * Tab area scroll handling — converts horizontal swipe to tab scroll, preserves vertical page scroll
   */
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        el.scrollLeft += e.deltaX;
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Non-admin redirect
  useEffect(() => {
    if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // Fetch data
  const { data: overview, isLoading: overviewLoading } = useStatOverview();
  const { data: trend } = useStatOverviewTrend();
  const { data: registrations, isLoading: registrationsLoading } = useStatRegistrations(period, days);
  const { data: registrationsApproved } = useStatRegistrationsApproved(period, days);
  const { data: logins } = useStatLogins(period, days);
  const { data: pageViews } = useStatPageViews(period, days);
  const { data: hourlyPageViews } = useStatPageViews('hourly', 1);
  const { data: announcements } = useStatAnnouncements(days);
  const { data: users } = useStatUsers();
  const { data: trading } = useStatTrading(days);
  const { data: popularAnnouncements } = useStatPopularAnnouncements();
  const { data: likeStats } = useStatLikes(days);
  const { data: chatStats } = useStatChat(days);

  // Guard: non-admin
  if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
    return null;
  }

  // 공지사항 + 댓글 타임라인을 단일 데이터셋으로 병합 / Merge announcement + comment timelines into single dataset
  const announcementChartData = (() => {
    if (!announcements) return [];
    const announcementMap = new Map(
      (announcements.announcements ?? []).map((e: { label: string; count: number }) => [e.label, e.count]),
    );
    const commentMap = new Map(
      (announcements.comments ?? []).map((e: { label: string; count: number }) => [e.label, e.count]),
    );
    const allDates = Array.from(
      new Set([...announcementMap.keys(), ...commentMap.keys()]),
    ).sort();
    return allDates.map((date) => ({
      date,
      announcements: announcementMap.get(date) ?? 0,
      comments: commentMap.get(date) ?? 0,
    }));
  })();

  // 좋아요 타임라인 병합 / Like timeline merge
  const likeChartData = (() => {
    if (!likeStats) return [];
    const aMap = new Map((likeStats.announcementLikes ?? []).map((e: { label: string; count: number }) => [e.label, e.count]));
    const cMap = new Map((likeStats.commentLikes ?? []).map((e: { label: string; count: number }) => [e.label, e.count]));
    const allDates = Array.from(new Set([...aMap.keys(), ...cMap.keys()])).sort();
    return allDates.map((date) => ({
      date,
      announcementLikes: aMap.get(date) ?? 0,
      commentLikes: cMap.get(date) ?? 0,
    }));
  })();

  // 역할별 분포 / Role distribution
  const roleData = (users?.byRole ?? []).map((r: { role: string; count: number }) => ({
    name: r.role,
    value: r.count,
    color: r.role === 'SYSTEM' ? CHART_COLORS.purple : r.role === 'ADMIN' ? CHART_COLORS.blue : CHART_COLORS.gray,
  }));

  // 계정 상태별 분포 / Status distribution
  const statusData = (users?.byStatus ?? []).map((s: { approvalStatus: string; isActive: boolean; count: number }) => {
    let statusLabel: string;
    let color: string;
    if (s.approvalStatus === 'APPROVED' && s.isActive) {
      statusLabel = t('admin.users.approved');
      color = CHART_COLORS.green;
    } else if (s.approvalStatus === 'REJECTED') {
      statusLabel = t('admin.users.rejected');
      color = CHART_COLORS.red;
    } else if (s.approvalStatus === 'PENDING') {
      statusLabel = t('admin.users.pending');
      color = CHART_COLORS.yellow;
    } else {
      // 비활성 사용자는 회색으로 구분 표시 (반려=빨강과 구별)
      // Inactive users shown in gray to distinguish from rejected (red)
      statusLabel = t('admin.users.inactive');
      color = CHART_COLORS.gray;
    }
    return { name: statusLabel, value: s.count, color };
  });

  const topPagesData = (pageViews?.topPages ?? [])
    .slice(0, 10)
    .map((p: { path: string; count: number }) => ({ path: p.path, views: p.count }));

  const hourlyData = hourlyPageViews?.timeline ?? [];

  const buySellData = trading
    ? [
        { name: t('stats.buy'), value: trading.buyCount, color: CHART_COLORS.red },
        { name: t('stats.sell'), value: trading.sellCount, color: CHART_COLORS.blue },
      ]
    : [];

  const participationRate =
    announcements && announcements.totalAnnouncements > 0
      ? (announcements.totalComments / announcements.totalAnnouncements).toFixed(1)
      : '0';

  return (
    <div className="overflow-hidden">
      {/* Page header */}
      <div className="py-6 flex items-center gap-2.5 h-[88px]">
        <BarChart3 className="w-5 h-5 text-accent" />
        <h1 className="text-[20px] font-extrabold text-text-primary">{t('stats.title')}</h1>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide sm:flex-wrap gap-1 mb-5 border-b border-border pb-1" ref={tabsRef}>
        {STAT_TABS.map((t_) => {
          const Icon = t_.icon;
          const isActive = tab === t_.key;
          return (
            <button
              key={t_.key}
              onClick={() => setTab(t_.key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 sm:px-4 py-2 text-[12px] sm:text-[13px] font-semibold transition-colors rounded-lg shrink-0',
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-quaternary hover:text-text-secondary hover:bg-bg-secondary/50',
              )}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              {t(t_.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Period / Days selectors - show only for non-overview tabs */}
      {tab !== 'overview' && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tab !== 'trading' && (
            <div className="flex flex-wrap gap-1 bg-bg-secondary border border-border rounded-xl p-1">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors',
                    period === opt.value
                      ? 'bg-accent text-white'
                      : 'text-text-quaternary hover:text-text-secondary',
                  )}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1 bg-bg-secondary border border-border rounded-xl p-1">
            {DAYS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors',
                  days === opt.value
                    ? 'bg-accent text-white'
                    : 'text-text-quaternary hover:text-text-secondary',
                )}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 탭 콘텐츠 — 동적 임포트된 컴포넌트 / Tab content — dynamically imported components ── */}
      {tab === 'overview' && (
        <OverviewTab
          overview={overview}
          overviewLoading={overviewLoading}
          trend={trend}
          registrations={registrations}
          registrationsLoading={registrationsLoading}
          logins={logins}
          pageViews={pageViews}
          trading={trading}
          announcementChartData={announcementChartData}
          buySellData={buySellData}
          t={t}
        />
      )}

      {tab === 'users' && (
        <UsersTab
          overview={overview}
          trend={trend}
          registrations={registrations}
          registrationsApproved={registrationsApproved}
          roleData={roleData}
          statusData={statusData}
          t={t}
        />
      )}

      {tab === 'activity' && (
        <ActivityTab
          overview={overview}
          trend={trend}
          logins={logins}
          pageViews={pageViews}
          topPagesData={topPagesData}
          hourlyData={hourlyData}
          t={t}
        />
      )}

      {tab === 'trading' && (
        <TradingTab
          trading={trading}
          buySellData={buySellData}
          t={t}
        />
      )}

      {tab === 'content' && (
        <ContentTab
          announcements={announcements}
          announcementChartData={announcementChartData}
          likeStats={likeStats}
          likeChartData={likeChartData}
          popularAnnouncements={popularAnnouncements}
          participationRate={participationRate}
          t={t}
        />
      )}

      {tab === 'chat' && (
        <ChatTab
          chatStats={chatStats}
          t={t}
        />
      )}

      {tab === 'audit' && (
        <AuditTab t={t} />
      )}
    </div>
  );
}
