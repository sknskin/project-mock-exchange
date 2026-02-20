/**
 * @file 관리자 통계 대시보드 페이지
 * @description 회원, 로그인, 페이지 방문, 공지사항 등 서비스 전반 통계를 시각화하는 관리자 전용 페이지
 *
 * @file Admin Statistics Dashboard Page
 * @description Admin-only page that visualizes service-wide statistics including users, logins, page views, and announcements
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
import { Users, LogIn, Eye, FileText, TrendingUp, Activity } from 'lucide-react';
import {
  useStatOverview,
  useStatRegistrations,
  useStatLogins,
  useStatPageViews,
  useStatAnnouncements,
  useStatUsers,
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
};

const TOOLTIP_STYLE = {
  backgroundColor: '#1E1E24',
  borderColor: 'rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#fff',
};

const GRID_STROKE = 'rgba(255,255,255,0.06)';
const AXIS_TICK_FILL = '#6B7683';
const AXIS_LINE_STROKE = 'rgba(255,255,255,0.06)';

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

// ===== Shared chart card wrapper =====
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
      <h3 className="text-[14px] font-semibold text-text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
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

// ===== Overview card =====
function OverviewCard({
  icon: Icon,
  value,
  label,
  iconColor,
}: {
  icon: React.ElementType;
  value: number | undefined;
  label: string;
  iconColor: string;
}) {
  return (
    <div className="bg-bg-secondary rounded-2xl p-5 border border-border flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${iconColor}18` }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-[20px] font-extrabold text-text-primary tabular-nums leading-tight">
          {value !== undefined ? value.toLocaleString() : '—'}
        </p>
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
  const { data: registrations } = useStatRegistrations(period, days);
  const { data: logins } = useStatLogins(period, days);
  const { data: pageViews } = useStatPageViews(period, days);
  const { data: announcements } = useStatAnnouncements(days);
  const { data: users } = useStatUsers();

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

  // Top pages for horizontal bar chart
  const topPagesData = (pageViews?.topPages ?? [])
    .slice(0, 10)
    .map((p) => ({ path: p.path, views: p.count }));

  return (
    <div>
      {/* Page header */}
      <div className="py-6 flex items-center gap-2.5">
        <TrendingUp className="w-5 h-5 text-accent" />
        <h1 className="text-[20px] font-extrabold text-text-primary">{t('stats.title')}</h1>
      </div>

      {/* ── Overview Cards ── */}
      <section className="mb-6">
        <h2 className="text-[12px] font-semibold text-text-quaternary uppercase tracking-wider mb-3">
          {t('stats.overview')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <OverviewCard
            icon={Users}
            value={overview?.totalUsers}
            label={t('stats.totalUsers')}
            iconColor={CHART_COLORS.blue}
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
          />
          <OverviewCard
            icon={Eye}
            value={overview?.totalPageViews}
            label={t('stats.totalPageViews')}
            iconColor={CHART_COLORS.gray}
          />
          <OverviewCard
            icon={LogIn}
            value={overview?.todayLogins}
            label={t('stats.todayLogins')}
            iconColor={CHART_COLORS.green}
          />
        </div>
      </section>

      {/* ── Period / Days Selectors ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Period */}
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

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 1. Registration Timeline - AreaChart */}
        <ChartCard title={t('stats.registrations')}>
          <ResponsiveContainer width="100%" height={300}>
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
        </ChartCard>

        {/* 2. Login Timeline - LineChart */}
        <ChartCard title={t('stats.logins')}>
          <ResponsiveContainer width="100%" height={300}>
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
        </ChartCard>

        {/* 3. Page View Timeline - BarChart */}
        <ChartCard title={t('stats.pageViews')}>
          <ResponsiveContainer width="100%" height={300}>
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
        </ChartCard>

        {/* 4. Announcement + Comments - BarChart */}
        <ChartCard title={t('stats.announcementStats')}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={announcementChartData}
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
        </ChartCard>

        {/* 5. User Distribution by Role - PieChart */}
        <ChartCard title={t('stats.userStats')}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={roleData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {roleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: TOOLTIP_STYLE.backgroundColor,
                  border: `1px solid ${TOOLTIP_STYLE.borderColor}`,
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: 13,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: AXIS_TICK_FILL, paddingTop: 8 }}
                formatter={(value) => (
                  <span style={{ color: '#9CA3AF', fontSize: 12 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 6. Top Pages - horizontal BarChart */}
        <ChartCard title={t('stats.topPages')}>
          <ResponsiveContainer width="100%" height={300}>
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
                width={120}
                tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }}
                axisLine={{ stroke: AXIS_LINE_STROKE }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: TOOLTIP_STYLE.backgroundColor,
                  border: `1px solid ${TOOLTIP_STYLE.borderColor}`,
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: 13,
                }}
              />
              <Bar
                dataKey="views"
                name={t('stats.pageViews')}
                fill={CHART_COLORS.blue}
                radius={[0, 3, 3, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  );
}
