/**
 * @file 관리자 통계 대시보드 페이지
 * @description 회원, 로그인, 페이지 방문, 공지사항, 거래 통계를 탭 구조로 시각화하는 관리자 전용 페이지
 *
 * @file Admin Statistics Dashboard Page
 * @description Admin-only page that visualizes service-wide statistics in a tabbed layout
 */
'use client';

import { useState, useEffect } from 'react';
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
import { Users, LogIn, Eye, FileText, TrendingUp, Activity, ShoppingCart, ArrowUpRight, ArrowDownRight, Minus, BarChart2, BarChart3 } from 'lucide-react';
import {
  useStatOverview,
  useStatOverviewTrend,
  useStatRegistrations,
  useStatLogins,
  useStatPageViews,
  useStatAnnouncements,
  useStatUsers,
  useStatTrading,
  useStatPopularAnnouncements,
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
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-400">
        <ArrowUpRight className="w-3 h-3" />
        +{changePercent}%
      </span>
    );
  }
  if (changePercent < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-400">
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

// ===== Overview card with optional trend =====
function OverviewCard({
  icon: Icon,
  value,
  label,
  iconColor,
  changePercent,
}: {
  icon: React.ElementType;
  value: number | undefined;
  label: string;
  iconColor: string;
  changePercent?: number;
}) {
  return (
    <div className="bg-bg-secondary rounded-2xl p-5 border border-border flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${iconColor}18` }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[20px] font-extrabold text-text-primary tabular-nums leading-tight">
            {value !== undefined ? value.toLocaleString() : '\u2014'}
          </p>
          {changePercent !== undefined && <TrendBadge changePercent={changePercent} />}
        </div>
        <p className="text-[12px] text-text-quaternary mt-0.5 truncate">{label}</p>
      </div>
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

  // Non-admin redirect
  useEffect(() => {
    if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // Fetch data
  const { data: overview } = useStatOverview();
  const { data: trend } = useStatOverviewTrend();
  const { data: registrations } = useStatRegistrations(period, days);
  const { data: logins } = useStatLogins(period, days);
  const { data: pageViews } = useStatPageViews(period, days);
  const { data: hourlyPageViews } = useStatPageViews('hourly', 1);
  const { data: announcements } = useStatAnnouncements(days);
  const { data: users } = useStatUsers();
  const { data: trading } = useStatTrading(days);
  const { data: popularAnnouncements } = useStatPopularAnnouncements();

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
      <div className="flex gap-1 mb-5 border-b border-border overflow-x-auto scrollbar-hide">
        {STAT_TABS.map((t_) => {
          const Icon = t_.icon;
          const isActive = tab === t_.key;
          return (
            <button
              key={t_.key}
              onClick={() => setTab(t_.key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 sm:px-4 py-2.5 text-[12px] sm:text-[13px] font-semibold transition-colors whitespace-nowrap border-b-2 -mb-px',
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-quaternary hover:text-text-secondary',
              )}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              {t(t_.labelKey)}
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Period / Days selectors - show only for non-overview tabs */}
      {tab !== 'overview' && (
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Period - hide for trading tab */}
          {tab !== 'trading' && (
            <div className="flex gap-1 bg-bg-secondary border border-border rounded-xl p-1">
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

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <section>
          <h2 className="text-[12px] font-semibold text-text-quaternary uppercase tracking-wider mb-3">
            {t('stats.overview')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <OverviewCard
              icon={Users}
              value={overview?.totalUsers}
              label={t('stats.totalUsers')}
              iconColor={CHART_COLORS.blue}
              changePercent={trend?.newUsers.changePercent}
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
            />
            <OverviewCard
              icon={LogIn}
              value={overview?.todayLogins}
              label={t('stats.todayLogins')}
              iconColor={CHART_COLORS.green}
              changePercent={trend?.logins.changePercent}
            />
          </div>
        </section>
      )}

      {/* ── Users Tab ── */}
      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Registration Timeline - AreaChart */}
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
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
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

      {/* ── Activity Tab ── */}
      {tab === 'activity' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Login Timeline - LineChart */}
          <ChartCard title={t('stats.logins')} description={t('stats.desc.logins')}>
            {hasChartData(logins) ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={logins ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
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
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
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
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
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
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
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
        </div>
      )}

      {/* ── Content Tab ── */}
      {tab === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Summary cards */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              icon={Activity}
              value={parseFloat(participationRate)}
              label={t('stats.commentsPerAnnouncement')}
              iconColor={CHART_COLORS.green}
            />
          </div>

          {/* Announcement + Comments - BarChart */}
          <ChartCard title={t('stats.announcementStats')} description={t('stats.desc.announcementStats')}>
            {hasChartData(announcementChartData) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={announcementChartData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  barSize={6}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                    axisLine={{ stroke: AXIS_LINE_STROKE }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: AXIS_TICK_FILL, paddingTop: 8 }}
                  />
                  <Bar
                    dataKey="announcements"
                    name={t('stats.announcementStats')}
                    fill={CHART_COLORS.blue}
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="comments"
                    name={t('stats.comments')}
                    fill={CHART_COLORS.red}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* Popular Announcements */}
          <ChartCard title={t('stats.popularAnnouncements')} description={t('stats.desc.popularAnnouncements')}>
            {popularAnnouncements && popularAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {popularAnnouncements.map((a, i) => (
                  <div key={a.id} className="flex items-center gap-3">
                    <span className="text-[13px] font-bold text-text-quaternary w-5 shrink-0 text-center">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-text-primary truncate flex-1">
                      {a.title}
                    </span>
                    <span className="text-[12px] text-text-quaternary shrink-0">
                      {a.commentCount} {t('stats.comments')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyChart height={200} />
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}
