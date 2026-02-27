/**
 * @file 관리자 통계 대시보드 페이지
 * @description 회원, 로그인, 페이지 방문, 공지사항, 거래 통계를 탭 구조로 시각화하는 관리자 전용 페이지
 *
 * @file Admin Statistics Dashboard Page
 * @description Admin-only page that visualizes service-wide statistics in a tabbed layout
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Users, LogIn, Eye, FileText, TrendingUp, Activity, ShoppingCart, ArrowUpRight, ArrowDownRight, Minus, BarChart2, BarChart3, Heart, MessageSquare, MessagesSquare, CalendarCheck, ClipboardList, Info } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
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

// ===== Theme constants =====
const CHART_COLORS = {
  blue: '#3182F6',
  red: '#F04452',
  green: '#00C48C',
  purple: '#9333ea',
  gray: '#6B7683',
  yellow: '#F5A623',
};

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-bg-elevated, #1E1E24)',
  borderColor: 'var(--color-border, rgba(255,255,255,0.1))',
  borderRadius: '8px',
  color: 'var(--color-text-primary, #fff)',
};

const GRID_STROKE = 'var(--color-border, rgba(255,255,255,0.06))';
const AXIS_TICK_FILL = 'var(--color-text-quaternary, #6B7683)';
const AXIS_LINE_STROKE = 'var(--color-border, rgba(255,255,255,0.06))';

// ===== Period / Days selector options =====
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

// ===== Tab definitions =====
const STAT_TABS = [
  { key: 'overview', labelKey: 'stats.tab.overview' as const, icon: TrendingUp },
  { key: 'users', labelKey: 'stats.tab.users' as const, icon: Users },
  { key: 'activity', labelKey: 'stats.tab.activity' as const, icon: Activity },
  { key: 'trading', labelKey: 'stats.tab.trading' as const, icon: ShoppingCart },
  { key: 'content', labelKey: 'stats.tab.content' as const, icon: FileText },
  { key: 'chat', labelKey: 'stats.tab.chat' as const, icon: MessageSquare },
  { key: 'audit', labelKey: 'admin.stats.orderAudit' as const, icon: ClipboardList },
];

// ===== Shared chart card wrapper =====
function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
      <h3 className="text-[14px] font-semibold text-text-primary mb-1">{title}</h3>
      {description && <p className="text-[12px] text-text-quaternary mb-3">{description}</p>}
      {!description && <div className="mb-3" />}
      {children}
    </div>
  );
}

// ===== Empty chart placeholder =====
function EmptyChart({ height = 280 }: { height?: number }) {
  const { t } = useTranslation();
  return (
    <div style={{ height }} className="flex flex-col items-center justify-center text-text-quaternary">
      <BarChart2 className="w-8 h-8 mb-2 opacity-30" />
      <span className="text-[13px]">{t('stats.noChartData')}</span>
    </div>
  );
}

// ===== Helper to check if chart data is sufficient =====
function hasChartData(data: unknown[] | undefined, minPoints = 2): boolean {
  return !!data && data.length >= minPoints;
}

// ===== Custom tooltip =====
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        backgroundColor: TOOLTIP_STYLE.backgroundColor,
        border: `1px solid ${TOOLTIP_STYLE.borderColor}`,
        borderRadius: TOOLTIP_STYLE.borderRadius,
        padding: '8px 12px',
      }}
    >
      {label && (
        <p className="text-[11px] text-text-quaternary mb-1">{label}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-[13px] font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ===== Trend badge =====
function TrendBadge({ changePercent }: { changePercent: number }) {
  if (changePercent > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-md">
        <ArrowUpRight className="w-3 h-3" />
        +{changePercent}%
      </span>
    );
  }
  if (changePercent < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-md">
        <ArrowDownRight className="w-3 h-3" />
        {changePercent}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-text-quaternary">
      <Minus className="w-3 h-3" />
      0%
    </span>
  );
}

// ===== Mini sparkline for KPI cards =====
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg width={w} height={h} className="shrink-0 opacity-60">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
      <polygon fill={color} fillOpacity="0.1" points={areaPoints} />
    </svg>
  );
}

// ===== Overview card with optional trend =====
function OverviewCard({
  icon: Icon,
  value,
  label,
  iconColor,
  changePercent,
  sparklineData,
}: {
  icon: React.ElementType;
  value: number | undefined;
  label: string;
  iconColor: string;
  changePercent?: number;
  sparklineData?: number[];
}) {
  return (
    <div className="bg-bg-secondary rounded-2xl p-3 sm:p-5 border border-border flex items-center gap-3 sm:gap-4 min-w-0">
      <div
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${iconColor}18` }}
      >
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: iconColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <p className="text-[16px] sm:text-[20px] font-extrabold text-text-primary tabular-nums leading-tight">
            {value !== undefined ? value.toLocaleString() : '\u2014'}
          </p>
          {changePercent !== undefined && <TrendBadge changePercent={changePercent} />}
        </div>
        <p className="text-[11px] sm:text-[12px] text-text-quaternary mt-0.5 truncate">{label}</p>
      </div>
      {sparklineData && sparklineData.length >= 2 && (
        <div className="hidden sm:block">
          <MiniSparkline data={sparklineData} color={iconColor} />
        </div>
      )}
    </div>
  );
}

// ===== Main page =====
export default function AdminStatsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('daily');
  const [days, setDays] = useState(30);
  const tabsRef = useRef<HTMLDivElement>(null);

  // 탭 영역에서 수평 스크롤만 변환, 수직 페이지 스크롤은 통과시킴
  // (Convert horizontal scroll in tabs, pass vertical page scroll through)
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      // 수평 스크롤이 더 클 때만 변환 (탭이 넘칠 때) (Only convert when horizontal delta is larger)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        el.scrollLeft += e.deltaX;
        e.preventDefault();
      }
      // 수직 스크롤은 브라우저 기본 동작으로 통과 (Vertical scroll passes through to page)
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

  // Merge announcement + comments into single dataset
  const announcementChartData = (() => {
    if (!announcements) return [];
    const announcementMap = new Map(
      (announcements.announcements ?? []).map((e) => [e.label, e.count]),
    );
    const commentMap = new Map(
      (announcements.comments ?? []).map((e) => [e.label, e.count]),
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

  // 좋아요 타임라인 데이터 병합 (공지사항 좋아요 + 댓글 좋아요)
  const likeChartData = (() => {
    if (!likeStats) return [];
    const aMap = new Map((likeStats.announcementLikes ?? []).map((e) => [e.label, e.count]));
    const cMap = new Map((likeStats.commentLikes ?? []).map((e) => [e.label, e.count]));
    const allDates = Array.from(new Set([...aMap.keys(), ...cMap.keys()])).sort();
    return allDates.map((date) => ({
      date,
      announcementLikes: aMap.get(date) ?? 0,
      commentLikes: cMap.get(date) ?? 0,
    }));
  })();

  // Role distribution for PieChart
  const roleData = (users?.byRole ?? []).map((r) => ({
    name: r.role,
    value: r.count,
    color:
      r.role === 'SYSTEM'
        ? CHART_COLORS.purple
        : r.role === 'ADMIN'
          ? CHART_COLORS.blue
          : CHART_COLORS.gray,
  }));

  // Status distribution for PieChart
  const statusData = (users?.byStatus ?? []).map((s) => {
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
      statusLabel = t('admin.users.inactive');
      color = CHART_COLORS.red;
    }
    return { name: statusLabel, value: s.count, color };
  });

  // Top pages for horizontal bar chart
  const topPagesData = (pageViews?.topPages ?? [])
    .slice(0, 10)
    .map((p) => ({ path: p.path, views: p.count }));

  // Hourly activity data
  const hourlyData = hourlyPageViews?.timeline ?? [];

  // Buy/Sell ratio for PieChart
  const buySellData = trading
    ? [
        { name: t('stats.buy'), value: trading.buyCount, color: CHART_COLORS.red },
        { name: t('stats.sell'), value: trading.sellCount, color: CHART_COLORS.blue },
      ]
    : [];

  // Participation rate
  const participationRate =
    announcements && announcements.totalAnnouncements > 0
      ? (announcements.totalComments / announcements.totalAnnouncements).toFixed(1)
      : '0';

  return (
    <div className="overflow-hidden">
      {/* Page header */}
      <div className="py-6 flex items-center gap-2.5">
        <BarChart3 className="w-5 h-5 text-accent" />
        <h1 className="text-[20px] font-extrabold text-text-primary">{t('stats.title')}</h1>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1 mb-5 border-b border-border pb-1" ref={tabsRef}>
        {STAT_TABS.map((t_) => {
          const Icon = t_.icon;
          const isActive = tab === t_.key;
          return (
            <button
              key={t_.key}
              onClick={() => setTab(t_.key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 sm:px-4 py-2 text-[12px] sm:text-[13px] font-semibold transition-colors rounded-lg',
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
          {/* Period - hide for trading tab */}
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

          {/* Days */}
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

      {/* ── Overview Tab: KPI 카드 + 주요 그래프 6개 ── */}
      {tab === 'overview' && (
        <section className="space-y-6">
          {/* KPI 요약 카드 */}
          <div>
            <h2 className="text-[12px] font-semibold text-text-quaternary uppercase tracking-wider mb-3">
              {t('stats.overview')}
            </h2>
            {overviewLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-bg-secondary rounded-2xl p-5 border border-border flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="w-20 h-5" />
                      <Skeleton className="w-28 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <OverviewCard
                icon={Users}
                value={overview?.totalUsers}
                label={t('stats.totalUsers')}
                iconColor={CHART_COLORS.blue}
                changePercent={trend?.newUsers.changePercent}
                sparklineData={registrations?.map((r) => r.count)}
              />
              <OverviewCard
                icon={Activity}
                value={overview?.activeUsers}
                label={t('stats.activeUsers')}
                iconColor={CHART_COLORS.green}
              />
              <OverviewCard
                icon={Users}
                value={overview?.pendingUsers}
                label={t('stats.pendingUsers')}
                iconColor={CHART_COLORS.red}
              />
              <OverviewCard
                icon={FileText}
                value={overview?.totalAnnouncements}
                label={t('stats.totalAnnouncements')}
                iconColor={CHART_COLORS.purple}
                changePercent={trend?.announcements.changePercent}
              />
              <OverviewCard
                icon={Eye}
                value={overview?.totalPageViews}
                label={t('stats.totalPageViews')}
                iconColor={CHART_COLORS.gray}
                changePercent={trend?.pageViews.changePercent}
                sparklineData={pageViews?.timeline?.map((p) => p.count)}
              />
              <OverviewCard
                icon={LogIn}
                value={overview?.todayLogins}
                label={t('stats.todayLogins')}
                iconColor={CHART_COLORS.green}
                changePercent={trend?.logins.changePercent}
                sparklineData={logins?.map((l) => l.count)}
              />
            </div>
            )}
          </div>

          {/* 주요 그래프 6개 */}
          {registrationsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-bg-secondary rounded-2xl p-5 border border-border">
                  <Skeleton className="w-32 h-4 mb-4" />
                  <Skeleton className="w-full h-[240px] rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1) 가입자 추이 그래프 */}
            <ChartCard title={t('stats.registrations')}>
              {hasChartData(registrations) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={registrations ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="overviewRegGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="label" tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} interval="preserveStartEnd" tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v} />
                    <YAxis tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="count" name={t('stats.registrations')} stroke={CHART_COLORS.blue} strokeWidth={2} fill="url(#overviewRegGrad)" dot={false} activeDot={{ r: 4, fill: CHART_COLORS.blue }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart height={240} />
              )}
            </ChartCard>

            {/* 2) 로그인 추이 그래프 */}
            <ChartCard title={t('stats.logins')}>
              {hasChartData(logins) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={logins ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="label" tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} interval="preserveStartEnd" tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v} />
                    <YAxis tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="count" name={t('stats.logins')} stroke={CHART_COLORS.red} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: CHART_COLORS.red }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart height={240} />
              )}
            </ChartCard>

            {/* 3) 페이지뷰 추이 그래프 */}
            <ChartCard title={t('stats.pageViews')}>
              {hasChartData(pageViews?.timeline) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={pageViews?.timeline ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="label" tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} interval="preserveStartEnd" tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v} />
                    <YAxis tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name={t('stats.pageViews')} fill={CHART_COLORS.green} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart height={240} />
              )}
            </ChartCard>

            {/* 4) 일별 거래량 그래프 */}
            <ChartCard title={t('stats.dailyVolume')}>
              {hasChartData(trading?.dailyVolume) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={trading?.dailyVolume ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="date" tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} interval="preserveStartEnd" tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v} />
                    <YAxis tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: AXIS_TICK_FILL, paddingTop: 8 }} />
                    <Bar dataKey="buy" name={t('stats.buy')} fill={CHART_COLORS.red} radius={[3, 3, 0, 0]} stackId="a" />
                    <Bar dataKey="sell" name={t('stats.sell')} fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart height={240} />
              )}
            </ChartCard>

            {/* 5) 공지사항/댓글 추이 그래프 */}
            <ChartCard title={t('stats.announcementStats')}>
              {hasChartData(announcementChartData) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={announcementChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="date" tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} interval="preserveStartEnd" tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v} />
                    <YAxis tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: AXIS_TICK_FILL, paddingTop: 8 }} />
                    <Bar dataKey="announcements" name={t('stats.announcementStats')} fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="comments" name={t('stats.comments')} fill={CHART_COLORS.red} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart height={240} />
              )}
            </ChartCard>

            {/* 6) 매수/매도 비율 파이 차트 */}
            <ChartCard title={t('stats.buySellDist')}>
              {buySellData.reduce((sum, d) => sum + d.value, 0) > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={buySellData} cx="50%" cy="50%" innerRadius={40} outerRadius={90} paddingAngle={3} dataKey="value" nameKey="name">
                      {buySellData.map((entry, index) => (
                        <Cell key={`overview-bs-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: AXIS_TICK_FILL, paddingTop: 8 }} formatter={(value) => (<span style={{ color: '#9CA3AF', fontSize: 12 }}>{value}</span>)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart height={240} />
              )}
            </ChartCard>
          </div>
          )}
        </section>
      )}

      {/* ── Users Tab: 요약 카드 + 등록 추이 + 역할/상태 분포 ── */}
      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 사용자 요약 카드 */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <OverviewCard icon={Users} value={overview?.totalUsers} label={t('stats.totalUsers')} iconColor={CHART_COLORS.blue} changePercent={trend?.newUsers.changePercent} />
            <OverviewCard icon={Activity} value={overview?.activeUsers} label={t('stats.activeUsers')} iconColor={CHART_COLORS.green} />
            <OverviewCard icon={Users} value={overview?.pendingUsers} label={t('stats.pendingUsers')} iconColor={CHART_COLORS.red} />
          </div>

          {/* Registration Requests Timeline - AreaChart */}
          <ChartCard title={t('stats.registrations')} description={t('stats.desc.registrations')}>
            {hasChartData(registrations) ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={registrations ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="registrationGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v}
                  />
                  <YAxis
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name={t('stats.registrations')}
                    stroke={CHART_COLORS.blue}
                    strokeWidth={2}
                    fill="url(#registrationGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: CHART_COLORS.blue }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* Approved Registrations Timeline - AreaChart */}
          <ChartCard title={t('stats.registrationsApproved')} description={t('stats.desc.registrationsApproved')}>
            {hasChartData(registrationsApproved) ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={registrationsApproved ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="registrationApprovedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v}
                  />
                  <YAxis
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name={t('stats.registrationsApproved')}
                    stroke={CHART_COLORS.green}
                    strokeWidth={2}
                    fill="url(#registrationApprovedGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: CHART_COLORS.green }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* User Distribution by Role - PieChart */}
          <ChartCard title={t('stats.userStats')} description={t('stats.desc.userRole')}>
            {roleData.reduce((sum, d) => sum + d.value, 0) > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {roleData.map((entry, index) => (
                      <Cell key={`role-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: AXIS_TICK_FILL, paddingTop: 8 }}
                    formatter={(value) => (
                      <span style={{ color: '#9CA3AF', fontSize: 12 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* User Status Distribution - PieChart */}
          <ChartCard title={t('stats.userStatus')} description={t('stats.desc.userStatus')}>
            {statusData.reduce((sum, d) => sum + d.value, 0) > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`status-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: AXIS_TICK_FILL, paddingTop: 8 }}
                    formatter={(value) => (
                      <span style={{ color: '#9CA3AF', fontSize: 12 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        </div>
      )}

      {/* ── Activity Tab: 요약 카드 + 로그인/페이지뷰/인기 페이지/시간대별 ── */}
      {tab === 'activity' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 활동 요약 카드 */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <OverviewCard icon={LogIn} value={overview?.todayLogins} label={t('stats.todayLogins')} iconColor={CHART_COLORS.red} changePercent={trend?.logins.changePercent} />
            <OverviewCard icon={Eye} value={overview?.totalPageViews} label={t('stats.totalPageViews')} iconColor={CHART_COLORS.green} changePercent={trend?.pageViews.changePercent} />
            <OverviewCard icon={Activity} value={topPagesData.length} label={t('stats.topPages')} iconColor={CHART_COLORS.blue} />
          </div>

          {/* Login Timeline - LineChart */}
          <ChartCard title={t('stats.logins')} description={t('stats.desc.logins')}>
            {hasChartData(logins) ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={logins ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v}
                  />
                  <YAxis
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name={t('stats.logins')}
                    stroke={CHART_COLORS.red}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: CHART_COLORS.red }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* Page View Timeline - BarChart */}
          <ChartCard title={t('stats.pageViews')} description={t('stats.desc.pageViews')}>
            {hasChartData(pageViews?.timeline) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={pageViews?.timeline ?? []}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  barSize={6}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v}
                  />
                  <YAxis
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    name={t('stats.pageViews')}
                    fill={CHART_COLORS.green}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* Top Pages - horizontal BarChart */}
          <ChartCard title={t('stats.topPages')} description={t('stats.desc.topPages')}>
            {hasChartData(topPagesData, 1) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={topPagesData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                  barSize={10}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="path"
                    width={90}
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="views"
                    name={t('stats.pageViews')}
                    fill={CHART_COLORS.blue}
                    radius={[0, 3, 3, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* Hourly Activity - BarChart */}
          <ChartCard title={t('stats.hourlyActivity')} description={t('stats.desc.hourlyActivity')}>
            {hasChartData(hourlyData, 1) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={hourlyData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  barSize={8}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v}
                  />
                  <YAxis
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    name={t('stats.hourlyActivity')}
                    fill={CHART_COLORS.purple}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        </div>
      )}

      {/* ── Trading Tab ── */}
      {tab === 'trading' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Summary cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <OverviewCard
              icon={ShoppingCart}
              value={trading?.totalOrders}
              label={t('stats.totalOrders')}
              iconColor={CHART_COLORS.blue}
            />
            <OverviewCard
              icon={Activity}
              value={trading ? Math.round(trading.totalVolume) : undefined}
              label={t('stats.totalVolume')}
              iconColor={CHART_COLORS.green}
            />
            <OverviewCard
              icon={TrendingUp}
              value={trading ? Math.round(trading.avgOrderSize * 100) / 100 : undefined}
              label={t('stats.avgOrderSize')}
              iconColor={CHART_COLORS.purple}
            />
            <OverviewCard
              icon={Users}
              value={trading ? trading.buyCount + trading.sellCount : undefined}
              label={t('stats.buySellRatio')}
              iconColor={CHART_COLORS.yellow}
            />
          </div>

          {/* Daily Volume - BarChart */}
          <ChartCard title={t('stats.dailyVolume')} description={t('stats.desc.dailyVolume')}>
            {hasChartData(trading?.dailyVolume) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={trading?.dailyVolume ?? []}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  barSize={8}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v}
                  />
                  <YAxis
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: AXIS_TICK_FILL, paddingTop: 8 }} />
                  <Bar
                    dataKey="buy"
                    name={t('stats.buy')}
                    fill={CHART_COLORS.red}
                    radius={[3, 3, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="sell"
                    name={t('stats.sell')}
                    fill={CHART_COLORS.blue}
                    radius={[3, 3, 0, 0]}
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* Popular Assets - horizontal BarChart */}
          <ChartCard title={t('stats.popularAssets')} description={t('stats.desc.popularAssets')}>
            {hasChartData(trading?.popularAssets, 1) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={trading?.popularAssets ?? []}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                  barSize={10}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="symbol"
                    width={90}
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="volume"
                    name={t('stats.totalVolume')}
                    fill={CHART_COLORS.green}
                    radius={[0, 3, 3, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* Buy/Sell Distribution - PieChart */}
          <ChartCard title={t('stats.buySellDist')} description={t('stats.desc.buySellDist')}>
            {buySellData.reduce((sum, d) => sum + d.value, 0) > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={buySellData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {buySellData.map((entry, index) => (
                      <Cell key={`bs-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: AXIS_TICK_FILL, paddingTop: 8 }}
                    formatter={(value) => (
                      <span style={{ color: '#9CA3AF', fontSize: 12 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* Popular Assets Volume Distribution - Donut Chart */}
          <ChartCard title={t('stats.popularAssetsDonut')} description={t('stats.desc.popularAssets')}>
            {trading?.popularAssets && trading.popularAssets.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={trading.popularAssets.slice(0, 8).map((a, i) => ({
                      name: a.symbol,
                      value: a.volume,
                      color: Object.values(CHART_COLORS)[i % Object.values(CHART_COLORS).length],
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {trading.popularAssets.slice(0, 8).map((_, i) => (
                      <Cell key={`pa-${i}`} fill={Object.values(CHART_COLORS)[i % Object.values(CHART_COLORS).length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        </div>
      )}

      {/* ── Content Tab: 공지사항/댓글/좋아요 통계 ── */}
      {tab === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 요약 카드 */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <OverviewCard
              icon={FileText}
              value={announcements?.totalAnnouncements}
              label={t('stats.totalAnnouncements')}
              iconColor={CHART_COLORS.blue}
            />
            <OverviewCard
              icon={FileText}
              value={announcements?.totalComments}
              label={t('stats.comments')}
              iconColor={CHART_COLORS.red}
            />
            <OverviewCard
              icon={Heart}
              value={likeStats ? likeStats.totalAnnouncementLikes + likeStats.totalCommentLikes : undefined}
              label={t('stats.totalLikes')}
              iconColor={CHART_COLORS.purple}
            />
            <OverviewCard
              icon={Activity}
              value={parseFloat(participationRate)}
              label={t('stats.commentsPerAnnouncement')}
              iconColor={CHART_COLORS.green}
            />
          </div>

          {/* 공지사항 + 댓글 추이 차트 */}
          <ChartCard title={t('stats.announcementStats')} description={t('stats.desc.announcementStats')}>
            {hasChartData(announcementChartData) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={announcementChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="date" tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} interval="preserveStartEnd" tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v} />
                  <YAxis tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: AXIS_TICK_FILL, paddingTop: 8 }} />
                  <Bar dataKey="announcements" name={t('stats.announcementStats')} fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="comments" name={t('stats.comments')} fill={CHART_COLORS.red} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* 좋아요 추이 차트 */}
          <ChartCard title={t('stats.likeStats')} description={t('stats.desc.likeStats')}>
            {hasChartData(likeChartData) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={likeChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="date" tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} interval="preserveStartEnd" tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v} />
                  <YAxis tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: AXIS_TICK_FILL, paddingTop: 8 }} />
                  <Bar dataKey="announcementLikes" name={t('stats.announcementLikes')} fill={CHART_COLORS.purple} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="commentLikes" name={t('stats.commentLikes')} fill={CHART_COLORS.yellow} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* 인기 공지사항 Top 10 (댓글 수 기준, 클릭하면 상세 이동) */}
          <ChartCard title={t('stats.popularAnnouncements')} description={t('stats.desc.popularAnnouncements')}>
            {popularAnnouncements && popularAnnouncements.length > 0 ? (
              <div className="space-y-2">
                {popularAnnouncements.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => router.push(`/announcements/${a.id}`)}
                    className="flex items-center gap-3 w-full text-left px-2 py-1.5 rounded-lg hover:bg-bg-tertiary transition-colors"
                  >
                    <span className="text-[13px] font-bold text-text-quaternary w-5 shrink-0 text-center">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-text-primary truncate flex-1">
                      {a.title}
                    </span>
                    <span className="text-[12px] text-text-quaternary shrink-0 flex items-center gap-2">
                      {a.likeCount !== undefined && (
                        <span className="flex items-center gap-0.5">
                          <Heart className="w-3 h-3" /> {a.likeCount}
                        </span>
                      )}
                      <span>{a.commentCount} {t('stats.comments')}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyChart height={200} />
            )}
          </ChartCard>

          {/* 좋아요가 가장 많은 공지사항 Top 10 */}
          <ChartCard title={t('stats.topLikedAnnouncements')} description={t('stats.desc.topLikedAnnouncements')}>
            {likeStats?.topLikedAnnouncements && likeStats.topLikedAnnouncements.length > 0 ? (
              <div className="space-y-2">
                {likeStats.topLikedAnnouncements.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => router.push(`/announcements/${a.id}`)}
                    className="flex items-center gap-3 w-full text-left px-2 py-1.5 rounded-lg hover:bg-bg-tertiary transition-colors"
                  >
                    <span className="text-[13px] font-bold text-text-quaternary w-5 shrink-0 text-center">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-text-primary truncate flex-1">
                      {a.title}
                    </span>
                    <span className="text-[12px] text-text-quaternary shrink-0 flex items-center gap-0.5">
                      <Heart className="w-3 h-3" /> {a.likeCount ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyChart height={200} />
            )}
          </ChartCard>
        </div>
      )}

      {/* ===== 채팅 탭 (Chat Tab) ===== */}
      {tab === 'chat' && (
        <div className="space-y-6">
          {/* 요약 카드 (Summary Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-bg-secondary rounded-2xl p-3 sm:p-4 border border-border">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-text-quaternary shrink-0" />
                <p className="text-[10px] sm:text-[11px] font-bold text-text-quaternary uppercase">{t('stats.chatRooms')}</p>
              </div>
              <p className="text-[18px] sm:text-[22px] font-extrabold text-text-primary mt-1">{chatStats?.totalRooms ?? '-'}</p>
              <p className="text-[10px] sm:text-[11px] text-text-quaternary mt-0.5">
                {t('stats.dm')} {chatStats?.dmCount ?? 0} · {t('stats.group')} {chatStats?.groupCount ?? 0}
              </p>
            </div>
            <div className="bg-bg-secondary rounded-2xl p-3 sm:p-4 border border-border">
              <div className="flex items-center gap-1.5">
                <MessagesSquare className="w-3.5 h-3.5 text-text-quaternary shrink-0" />
                <p className="text-[10px] sm:text-[11px] font-bold text-text-quaternary uppercase">{t('stats.messages')}</p>
              </div>
              <p className="text-[18px] sm:text-[22px] font-extrabold text-text-primary mt-1">{chatStats?.totalMessages?.toLocaleString() ?? '-'}</p>
            </div>
            <div className="bg-bg-secondary rounded-2xl p-3 sm:p-4 border border-border">
              <div className="flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-text-quaternary shrink-0" />
                <p className="text-[10px] sm:text-[11px] font-bold text-text-quaternary uppercase">{t('stats.todayMessages')}</p>
              </div>
              <p className="text-[18px] sm:text-[22px] font-extrabold text-text-primary mt-1">{chatStats?.todayMessages ?? '-'}</p>
              {chatStats && chatStats.yesterdayMessages > 0 && (
                <p className={cn('text-[11px] mt-0.5 flex items-center gap-0.5',
                  chatStats.todayMessages >= chatStats.yesterdayMessages ? 'text-success' : 'text-danger')}>
                  {chatStats.todayMessages >= chatStats.yesterdayMessages
                    ? <ArrowUpRight className="w-3 h-3" />
                    : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(((chatStats.todayMessages - chatStats.yesterdayMessages) / chatStats.yesterdayMessages) * 100).toFixed(0)}%
                </p>
              )}
            </div>
            <div className="bg-bg-secondary rounded-2xl p-3 sm:p-4 border border-border">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-text-quaternary shrink-0" />
                <p className="text-[10px] sm:text-[11px] font-bold text-text-quaternary uppercase">{t('stats.activeParticipants')}</p>
              </div>
              <p className="text-[18px] sm:text-[22px] font-extrabold text-text-primary mt-1">{chatStats?.activeParticipants ?? '-'}</p>
            </div>
          </div>

          {/* 차트 영역 (Charts) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 일별 메시지 수 (Daily Messages) */}
            <ChartCard title={t('stats.dailyMessages')}>
              {chatStats?.dailyMessages?.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chatStats.dailyMessages}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--text-quaternary)', fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'var(--text-quaternary)', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="count" stroke={CHART_COLORS.blue} fill={CHART_COLORS.blue} fillOpacity={0.15} name={t('stats.messages')} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart height={240} />
              )}
            </ChartCard>

            {/* 채팅방 유형 분포 (Room Type Distribution) */}
            <ChartCard title={t('stats.roomDistribution')}>
              {chatStats && chatStats.totalRooms > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: t('stats.dm'), value: chatStats.dmCount },
                        { name: t('stats.group'), value: chatStats.groupCount },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      <Cell fill={CHART_COLORS.blue} />
                      <Cell fill={CHART_COLORS.green} />
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart height={240} />
              )}
            </ChartCard>
          </div>

          {/* Top Rooms */}
          {chatStats?.topRooms && chatStats.topRooms.length > 0 && (
            <ChartCard title={t('stats.topRooms')}>
              <div className="space-y-2">
                {chatStats.topRooms.map((room: { roomId: string; name: string; type: string; messageCount: number }, i: number) => (
                  <div
                    key={room.roomId}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-bg-tertiary transition-colors"
                  >
                    <span className="text-[13px] font-bold text-text-quaternary w-5 shrink-0 text-center">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-text-primary truncate flex-1">
                      {room.name}
                    </span>
                    <span className="text-[12px] text-text-quaternary shrink-0 flex items-center gap-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-bg-tertiary">
                        {room.type === 'DM' ? t('stats.dm') : t('stats.group')}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {room.messageCount}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

        </div>
      )}

      {/* ===== Order Audit Tab ===== */}
      {tab === 'audit' && (
        <div className="space-y-4">
          {/* Description */}
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-accent/5 border border-accent/20">
            <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            <span className="text-[13px] text-text-secondary">
              {t('admin.stats.orderAudit.desc')}
            </span>
          </div>

          {/* Order audit table */}
          <div className="bg-bg-secondary rounded-2xl border border-border overflow-hidden">
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-border/80">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-quaternary">
                      {t('admin.stats.orderAudit.id')}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-quaternary">
                      {t('admin.stats.orderAudit.user')}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-quaternary">
                      {t('admin.stats.orderAudit.symbol')}
                    </th>
                    <th className="px-4 py-2.5 text-center text-[11px] font-medium text-text-quaternary">
                      {t('admin.stats.orderAudit.side')}
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium text-text-quaternary">
                      {t('admin.stats.orderAudit.qty')}
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium text-text-quaternary">
                      {t('admin.stats.orderAudit.price')}
                    </th>
                    <th className="px-4 py-2.5 text-center text-[11px] font-medium text-text-quaternary">
                      {t('admin.stats.orderAudit.status')}
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium text-text-quaternary">
                      {t('admin.stats.orderAudit.time')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={8} className="px-4 py-20 text-center text-[14px] text-text-quaternary">
                      {t('admin.stats.orderAudit.noData')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile view */}
            <div className="sm:hidden px-4 py-20 text-center text-[14px] text-text-quaternary">
              {t('admin.stats.orderAudit.noData')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
