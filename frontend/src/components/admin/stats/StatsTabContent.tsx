/**
 * @file 통계 탭 콘텐츠 컴포넌트
 * @description 7개 탭(개요, 회원, 활동, 거래, 콘텐츠, 채팅, 감사)의 차트/UI를 코드 분할을 위해 별도 파일로 추출.
 *   Recharts 번들을 이 청크에만 포함시켜 초기 로드 크기를 줄임.
 *
 * @file Stats tab content components
 * @description Extracts chart/UI for 7 tabs (overview, users, activity, trading, content, chat, audit)
 *   for code-splitting. Keeps Recharts bundle in this chunk only, reducing initial load size.
 */
'use client';

import React from 'react';
import Link from 'next/link';
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
import {
  Users, LogIn, Eye, FileText, TrendingUp, Activity, ShoppingCart,
  ArrowUpRight, ArrowDownRight, Heart, MessageSquare, MessagesSquare,
  CalendarCheck, Info,
} from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import { cn } from '@/lib/format';
import type { TranslationKey } from '@/lib/i18n';
import {
  CHART_COLORS, GRID_STROKE, AXIS_TICK_FILL, AXIS_LINE_STROKE,
  ChartCard, EmptyChart, hasChartData, CustomTooltip, OverviewCard,
} from './StatsShared';

/* ─── 공통 props 타입 / Common props types ─── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

interface OverviewTabProps {
  overview: AnyData;
  overviewLoading: boolean;
  trend: AnyData;
  registrations: AnyData;
  registrationsLoading: boolean;
  logins: AnyData;
  pageViews: AnyData;
  trading: AnyData;
  announcementChartData: AnyData[];
  buySellData: AnyData[];
  t: (key: TranslationKey) => string;
}

/** 개요 탭 — KPI 요약, 트렌드 차트, 가입/로그인/조회수 시계열
 * Overview tab — KPI summary, trend charts, registration/login/pageview time-series */
export function OverviewTab({
  overview, overviewLoading, trend, registrations, registrationsLoading,
  logins, pageViews, trading, announcementChartData, buySellData, t,
}: OverviewTabProps) {
  return (
    <section className="space-y-6">
      {/* KPI 요약 카드 / KPI summary cards */}
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
          <OverviewCard icon={Users} value={overview?.totalUsers} label={t('stats.totalUsers')} iconColor={CHART_COLORS.blue} changePercent={trend?.newUsers.changePercent} sparklineData={registrations?.map((r: AnyData) => r.count)} />
          <OverviewCard icon={Activity} value={overview?.activeUsers} label={t('stats.activeUsers')} iconColor={CHART_COLORS.green} />
          <OverviewCard icon={Users} value={overview?.pendingUsers} label={t('stats.pendingUsers')} iconColor={CHART_COLORS.red} />
          <OverviewCard icon={FileText} value={overview?.totalAnnouncements} label={t('stats.totalAnnouncements')} iconColor={CHART_COLORS.purple} changePercent={trend?.announcements.changePercent} />
          <OverviewCard icon={Eye} value={overview?.totalPageViews} label={t('stats.totalPageViews')} iconColor={CHART_COLORS.gray} changePercent={trend?.pageViews.changePercent} sparklineData={pageViews?.timeline?.map((p: AnyData) => p.count)} />
          <OverviewCard icon={LogIn} value={overview?.todayLogins} label={t('stats.todayLogins')} iconColor={CHART_COLORS.green} changePercent={trend?.logins.changePercent} sparklineData={logins?.map((l: AnyData) => l.count)} />
        </div>
        )}
      </div>

      {/* 주요 그래프 6개 / 6 main charts */}
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
        {/* 1) 가입자 추이 / Registration trend */}
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

        {/* 2) 로그인 추이 / Login trend */}
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

        {/* 3) 페이지뷰 / Page views */}
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

        {/* 4) 일별 거래량 / Daily volume */}
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

        {/* 5) 공지사항/댓글 추이 / Announcement/comment trend */}
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

        {/* 6) 매수/매도 비율 / Buy/sell ratio */}
        <ChartCard title={t('stats.buySellDist')}>
          {buySellData.reduce((sum: number, d: AnyData) => sum + d.value, 0) > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={buySellData} cx="50%" cy="50%" innerRadius={40} outerRadius={90} paddingAngle={3} dataKey="value" nameKey="name">
                  {buySellData.map((entry: AnyData, index: number) => (
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
  );
}

/* ─── 회원 탭 / Users Tab ─── */

interface UsersTabProps {
  overview: AnyData;
  trend: AnyData;
  registrations: AnyData;
  registrationsApproved: AnyData;
  roleData: AnyData[];
  statusData: AnyData[];
  t: (key: TranslationKey) => string;
}

/** 회원 탭 — 가입 현황, 상태별 분포, 최근 가입자 목록
 * Users tab — registration trends, status distribution, recent registrations */
export function UsersTab({
  overview, trend, registrations, registrationsApproved,
  roleData, statusData, t,
}: UsersTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 사용자 요약 카드 / User summary cards */}
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <OverviewCard icon={Users} value={overview?.totalUsers} label={t('stats.totalUsers')} iconColor={CHART_COLORS.blue} changePercent={trend?.newUsers.changePercent} />
        <OverviewCard icon={Activity} value={overview?.activeUsers} label={t('stats.activeUsers')} iconColor={CHART_COLORS.green} />
        <OverviewCard icon={Users} value={overview?.pendingUsers} label={t('stats.pendingUsers')} iconColor={CHART_COLORS.red} />
      </div>

      {/* Registration Requests Timeline */}
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
              <XAxis dataKey="label" tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} interval="preserveStartEnd" tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v} />
              <YAxis tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name={t('stats.registrations')} stroke={CHART_COLORS.blue} strokeWidth={2} fill="url(#registrationGrad)" dot={false} activeDot={{ r: 4, fill: CHART_COLORS.blue }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Approved Registrations Timeline */}
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
              <XAxis dataKey="label" tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} interval="preserveStartEnd" tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v} />
              <YAxis tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name={t('stats.registrationsApproved')} stroke={CHART_COLORS.green} strokeWidth={2} fill="url(#registrationApprovedGrad)" dot={false} activeDot={{ r: 4, fill: CHART_COLORS.green }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Role Distribution PieChart */}
      <ChartCard title={t('stats.userStats')} description={t('stats.desc.userRole')}>
        {roleData.reduce((sum, d) => sum + d.value, 0) > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={110} paddingAngle={3} dataKey="value" nameKey="name">
                {roleData.map((entry: AnyData, index: number) => (
                  <Cell key={`role-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: AXIS_TICK_FILL, paddingTop: 8 }} formatter={(value) => (<span style={{ color: '#9CA3AF', fontSize: 12 }}>{value}</span>)} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Status Distribution PieChart */}
      <ChartCard title={t('stats.userStatus')} description={t('stats.desc.userStatus')}>
        {statusData.reduce((sum, d) => sum + d.value, 0) > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={110} paddingAngle={3} dataKey="value" nameKey="name">
                {statusData.map((entry: AnyData, index: number) => (
                  <Cell key={`status-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: AXIS_TICK_FILL, paddingTop: 8 }} formatter={(value) => (<span style={{ color: '#9CA3AF', fontSize: 12 }}>{value}</span>)} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>
    </div>
  );
}

/* ─── 활동 탭 / Activity Tab ─── */

interface ActivityTabProps {
  overview: AnyData;
  trend: AnyData;
  logins: AnyData;
  pageViews: AnyData;
  topPagesData: AnyData[];
  hourlyData: AnyData[];
  t: (key: TranslationKey) => string;
}

/** 활동 탭 — 로그인/페이지뷰 시계열 차트
 * Activity tab — login/pageview time-series charts */
export function ActivityTab({
  overview, trend, logins, pageViews, topPagesData, hourlyData, t,
}: ActivityTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 활동 요약 카드 / Activity summary cards */}
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <OverviewCard icon={LogIn} value={overview?.todayLogins} label={t('stats.todayLogins')} iconColor={CHART_COLORS.red} changePercent={trend?.logins.changePercent} />
        <OverviewCard icon={Eye} value={overview?.totalPageViews} label={t('stats.totalPageViews')} iconColor={CHART_COLORS.green} changePercent={trend?.pageViews.changePercent} />
        <OverviewCard icon={Activity} value={topPagesData.length} label={t('stats.topPages')} iconColor={CHART_COLORS.blue} />
      </div>

      {/* Login Timeline */}
      <ChartCard title={t('stats.logins')} description={t('stats.desc.logins')}>
        {hasChartData(logins) ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={logins ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="label" tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} interval="preserveStartEnd" tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v} />
              <YAxis tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" name={t('stats.logins')} stroke={CHART_COLORS.red} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: CHART_COLORS.red }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Page View Timeline */}
      <ChartCard title={t('stats.pageViews')} description={t('stats.desc.pageViews')}>
        {hasChartData(pageViews?.timeline) ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={pageViews?.timeline ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="label" tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} interval="preserveStartEnd" tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v} />
              <YAxis tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name={t('stats.pageViews')} fill={CHART_COLORS.green} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Top Pages */}
      <ChartCard title={t('stats.topPages')} description={t('stats.desc.topPages')}>
        {hasChartData(topPagesData, 1) ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topPagesData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
              <YAxis type="category" dataKey="path" width={90} tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="views" name={t('stats.pageViews')} fill={CHART_COLORS.blue} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Hourly Activity */}
      <ChartCard title={t('stats.hourlyActivity')} description={t('stats.desc.hourlyActivity')}>
        {hasChartData(hourlyData, 1) ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="label" tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} interval="preserveStartEnd" tickFormatter={(v: string) => v.length > 8 ? v.slice(5) : v} />
              <YAxis tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name={t('stats.hourlyActivity')} fill={CHART_COLORS.purple} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>
    </div>
  );
}

/* ─── 거래 탭 / Trading Tab ─── */

interface TradingTabProps {
  trading: AnyData;
  buySellData: AnyData[];
  t: (key: TranslationKey) => string;
}

/** 거래 탭 — 주문 통계, 매수/매도 비율, 거래량 차트
 * Trading tab — order stats, buy/sell ratio, volume charts */
export function TradingTab({ trading, buySellData, t }: TradingTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Summary cards */}
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <OverviewCard icon={ShoppingCart} value={trading?.totalOrders} label={t('stats.totalOrders')} iconColor={CHART_COLORS.blue} />
        <OverviewCard icon={Activity} value={trading ? Math.round(trading.totalVolume) : undefined} label={t('stats.totalVolume')} iconColor={CHART_COLORS.green} />
        <OverviewCard icon={TrendingUp} value={trading ? Math.round(trading.avgOrderSize * 100) / 100 : undefined} label={t('stats.avgOrderSize')} iconColor={CHART_COLORS.purple} />
        <OverviewCard icon={Users} value={trading ? trading.buyCount + trading.sellCount : undefined} label={t('stats.buySellRatio')} iconColor={CHART_COLORS.yellow} />
      </div>

      {/* Daily Volume */}
      <ChartCard title={t('stats.dailyVolume')} description={t('stats.desc.dailyVolume')}>
        {hasChartData(trading?.dailyVolume) ? (
          <ResponsiveContainer width="100%" height={280}>
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
          <EmptyChart />
        )}
      </ChartCard>

      {/* Popular Assets */}
      <ChartCard title={t('stats.popularAssets')} description={t('stats.desc.popularAssets')}>
        {hasChartData(trading?.popularAssets, 1) ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trading?.popularAssets ?? []} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
              <YAxis type="category" dataKey="symbol" width={90} tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }} axisLine={{ stroke: AXIS_LINE_STROKE }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="volume" name={t('stats.totalVolume')} fill={CHART_COLORS.green} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Buy/Sell Distribution */}
      <ChartCard title={t('stats.buySellDist')} description={t('stats.desc.buySellDist')}>
        {buySellData.reduce((sum: number, d: AnyData) => sum + d.value, 0) > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={buySellData} cx="50%" cy="50%" innerRadius={50} outerRadius={110} paddingAngle={3} dataKey="value" nameKey="name">
                {buySellData.map((entry: AnyData, index: number) => (
                  <Cell key={`bs-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: AXIS_TICK_FILL, paddingTop: 8 }} formatter={(value) => (<span style={{ color: '#9CA3AF', fontSize: 12 }}>{value}</span>)} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Popular Assets Volume Donut */}
      <ChartCard title={t('stats.popularAssetsDonut')} description={t('stats.desc.popularAssets')}>
        {trading?.popularAssets && trading.popularAssets.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={trading.popularAssets.slice(0, 8).map((a: AnyData, i: number) => ({
                  name: a.symbol,
                  value: a.volume,
                  color: Object.values(CHART_COLORS)[i % Object.values(CHART_COLORS).length],
                }))}
                cx="50%" cy="50%" innerRadius={50} outerRadius={110} paddingAngle={2} dataKey="value" nameKey="name"
                label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {trading.popularAssets.slice(0, 8).map((_: AnyData, i: number) => (
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
  );
}

/* ─── 콘텐츠 탭 / Content Tab ─── */

interface ContentTabProps {
  announcements: AnyData;
  announcementChartData: AnyData[];
  likeStats: AnyData;
  likeChartData: AnyData[];
  popularAnnouncements: AnyData;
  participationRate: string;
  t: (key: TranslationKey) => string;
}

/** 콘텐츠 탭 — 공지사항 통계, 인기 게시물
 * Content tab — announcement stats, popular posts */
export function ContentTab({
  announcements, announcementChartData, likeStats, likeChartData,
  popularAnnouncements, participationRate, t,
}: ContentTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 요약 카드 / Summary cards */}
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <OverviewCard icon={FileText} value={announcements?.totalAnnouncements} label={t('stats.totalAnnouncements')} iconColor={CHART_COLORS.blue} />
        <OverviewCard icon={FileText} value={announcements?.totalComments} label={t('stats.comments')} iconColor={CHART_COLORS.red} />
        <OverviewCard icon={Heart} value={likeStats ? likeStats.totalAnnouncementLikes + likeStats.totalCommentLikes : undefined} label={t('stats.totalLikes')} iconColor={CHART_COLORS.purple} />
        <OverviewCard icon={Activity} value={parseFloat(participationRate)} label={t('stats.commentsPerAnnouncement')} iconColor={CHART_COLORS.green} />
      </div>

      {/* 공지사항 + 댓글 추이 / Announcement + comment trend */}
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

      {/* 좋아요 추이 / Like trend */}
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

      {/* 인기 공지사항 / Popular announcements */}
      <ChartCard title={t('stats.popularAnnouncements')} description={t('stats.desc.popularAnnouncements')}>
        {popularAnnouncements && popularAnnouncements.length > 0 ? (
          <div className="space-y-2">
            {popularAnnouncements.map((a: AnyData, i: number) => (
              <Link
                key={a.id}
                href={`/announcements/${a.id}`}
                className="flex items-center gap-3 w-full text-left px-2 py-1.5 rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                <span className="text-[13px] font-bold text-text-quaternary w-5 shrink-0 text-center">{i + 1}</span>
                <span className="text-[13px] text-text-primary truncate flex-1">{a.title}</span>
                <span className="text-[12px] text-text-quaternary shrink-0 flex items-center gap-2">
                  {a.likeCount !== undefined && (
                    <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {a.likeCount}</span>
                  )}
                  <span>{a.commentCount} {t('stats.comments')}</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyChart height={200} />
        )}
      </ChartCard>

      {/* 좋아요 Top 10 / Top liked */}
      <ChartCard title={t('stats.topLikedAnnouncements')} description={t('stats.desc.topLikedAnnouncements')}>
        {likeStats?.topLikedAnnouncements && likeStats.topLikedAnnouncements.length > 0 ? (
          <div className="space-y-2">
            {likeStats.topLikedAnnouncements.map((a: AnyData, i: number) => (
              <Link
                key={a.id}
                href={`/announcements/${a.id}`}
                className="flex items-center gap-3 w-full text-left px-2 py-1.5 rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                <span className="text-[13px] font-bold text-text-quaternary w-5 shrink-0 text-center">{i + 1}</span>
                <span className="text-[13px] text-text-primary truncate flex-1">{a.title}</span>
                <span className="text-[12px] text-text-quaternary shrink-0 flex items-center gap-0.5">
                  <Heart className="w-3 h-3" /> {a.likeCount ?? 0}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyChart height={200} />
        )}
      </ChartCard>
    </div>
  );
}

/* ─── 채팅 탭 / Chat Tab ─── */

interface ChatTabProps {
  chatStats: AnyData;
  t: (key: TranslationKey) => string;
}

/** 채팅 탭 — 채팅방/메시지 통계, 활동 차트
 * Chat tab — room/message stats, activity charts */
export function ChatTab({ chatStats, t }: ChatTabProps) {
  return (
    <div className="space-y-6">
      {/* 요약 카드 / Summary cards */}
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

      {/* 차트 영역 / Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 일별 메시지 수 / Daily messages */}
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

        {/* 채팅방 유형 분포 / Room type distribution */}
        <ChartCard title={t('stats.roomDistribution')}>
          {chatStats && chatStats.totalRooms > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={[
                    { name: t('stats.dm'), value: chatStats.dmCount },
                    { name: t('stats.group'), value: chatStats.groupCount },
                  ]}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
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
    </div>
  );
}

/* ─── 감사 탭 / Audit Tab ─── */

interface AuditTabProps {
  t: (key: TranslationKey) => string;
}

/** 감사 탭 — 감사 로그 페이지 바로가기
 * Audit tab — link to audit log page */
export function AuditTab({ t }: AuditTabProps) {
  return (
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
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-quaternary">{t('admin.stats.orderAudit.id')}</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-quaternary">{t('admin.stats.orderAudit.user')}</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-quaternary">{t('admin.stats.orderAudit.symbol')}</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-medium text-text-quaternary">{t('admin.stats.orderAudit.side')}</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium text-text-quaternary">{t('admin.stats.orderAudit.qty')}</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium text-text-quaternary">{t('admin.stats.orderAudit.price')}</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-medium text-text-quaternary">{t('admin.stats.orderAudit.status')}</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium text-text-quaternary">{t('admin.stats.orderAudit.time')}</th>
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
  );
}
