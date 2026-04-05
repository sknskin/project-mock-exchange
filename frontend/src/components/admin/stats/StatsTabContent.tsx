/**
 * @file 통계 탭 콘텐츠 컴포넌트
 * @description 7개 탭(개요, 회원, 활동, 거래, 콘텐츠, 채팅, 감사)의 차트/UI를 코드 분할을 위해 별도 파일로 추출.
 *   경량 SVG 차트 컴포넌트를 사용하여 번들 크기를 최소화.
 *
 * @file Stats tab content components
 * @description Extracts chart/UI for 7 tabs (overview, users, activity, trading, content, chat, audit)
 *   for code-splitting. Uses lightweight SVG chart components to minimize bundle size.
 */
'use client';

import React from 'react';
import Pagination from '@/components/ui/Pagination';
import Link from 'next/link';
// 경량 SVG 차트 컴포넌트 — recharts 대체
// Lightweight SVG chart components — recharts replacement
import MiniLineChart from '@/components/chart/MiniLineChart';
import MiniBarChart from '@/components/chart/MiniBarChart';
import DonutChart from '@/components/chart/DonutChart';
import {
  Users, LogIn, Eye, FileText, TrendingUp, Activity, ShoppingCart,
  ArrowUpRight, ArrowDownRight, Heart, MessageSquare, MessagesSquare,
  CalendarCheck, Info,
} from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import { cn } from '@/lib/format';
import type { TranslationKey } from '@/lib/i18n';
import {
  CHART_COLORS,
  ChartCard, EmptyChart, hasChartData, OverviewCard,
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
            <MiniLineChart
              data={(registrations ?? []).map((d: AnyData) => ({ label: d.label, value: d.count }))}
              height={240}
              color={CHART_COLORS.blue}
              area
              name={t('stats.registrations')}
            />
          ) : (
            <EmptyChart height={240} />
          )}
        </ChartCard>

        {/* 2) 로그인 추이 / Login trend */}
        <ChartCard title={t('stats.logins')}>
          {hasChartData(logins) ? (
            <MiniLineChart
              data={(logins ?? []).map((d: AnyData) => ({ label: d.label, value: d.count }))}
              height={240}
              color={CHART_COLORS.red}
              name={t('stats.logins')}
            />
          ) : (
            <EmptyChart height={240} />
          )}
        </ChartCard>

        {/* 3) 페이지뷰 / Page views */}
        <ChartCard title={t('stats.pageViews')}>
          {hasChartData(pageViews?.timeline) ? (
            <MiniBarChart
              data={(pageViews?.timeline ?? []).map((d: AnyData) => ({
                label: d.label,
                values: [{ key: t('stats.pageViews'), value: d.count, color: CHART_COLORS.green }],
              }))}
              height={240}
            />
          ) : (
            <EmptyChart height={240} />
          )}
        </ChartCard>

        {/* 4) 일별 거래량 / Daily volume */}
        <ChartCard title={t('stats.dailyVolume')}>
          {hasChartData(trading?.dailyVolume) ? (
            <MiniBarChart
              data={(trading?.dailyVolume ?? []).map((d: AnyData) => ({
                label: d.date,
                values: [
                  { key: t('stats.buy'), value: d.buy, color: CHART_COLORS.red },
                  { key: t('stats.sell'), value: d.sell, color: CHART_COLORS.blue },
                ],
              }))}
              height={240}
              stacked
              showLegend
            />
          ) : (
            <EmptyChart height={240} />
          )}
        </ChartCard>

        {/* 5) 공지사항/댓글 추이 / Announcement/comment trend */}
        <ChartCard title={t('stats.announcementStats')}>
          {hasChartData(announcementChartData) ? (
            <MiniBarChart
              data={announcementChartData.map((d: AnyData) => ({
                label: d.date,
                values: [
                  { key: t('stats.announcementStats'), value: d.announcements, color: CHART_COLORS.blue },
                  { key: t('stats.comments'), value: d.comments, color: CHART_COLORS.red },
                ],
              }))}
              height={240}
              showLegend
            />
          ) : (
            <EmptyChart height={240} />
          )}
        </ChartCard>

        {/* 6) 매수/매도 비율 / Buy/sell ratio */}
        <ChartCard title={t('stats.buySellDist')}>
          {buySellData.reduce((sum: number, d: AnyData) => sum + d.value, 0) > 0 ? (
            <div className="flex justify-center">
              <DonutChart data={buySellData} size={200} />
            </div>
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
  registrationsRejected?: AnyData;
  roleData: AnyData[];
  statusData: AnyData[];
  t: (key: TranslationKey) => string;
}

/** 회원 탭 — 가입 현황, 상태별 분포, 최근 가입자 목록
 * Users tab — registration trends, status distribution, recent registrations */
export function UsersTab({
  overview, trend, registrations, registrationsApproved, registrationsRejected,
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
          <MiniLineChart
            data={(registrations ?? []).map((d: AnyData) => ({ label: d.label, value: d.count }))}
            height={280}
            color={CHART_COLORS.blue}
            area
            name={t('stats.registrations')}
          />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* 회원 현황 통합 그래프 — 승인/반려/비활성화 (승인 데이터 기준 라인 차트)
         Unified member status chart — approved/rejected/deactivated (line chart based on approved data) */}
      <ChartCard title={t('stats.registrationsApproved')} description={t('stats.desc.registrationsApproved')}>
        {hasChartData(registrationsApproved) ? (() => {
          // 승인 데이터와 반려/비활성화 데이터를 label 기준으로 병합
          // Merge approved data with rejected/deactivated data by label
          const approvedMap = new Map((registrationsApproved ?? []).map((r: AnyData) => [r.label, r.count]));
          const rejectedArr = Array.isArray(registrationsRejected) ? registrationsRejected : [];
          const rejectedMap = new Map(rejectedArr.map((r: AnyData) => [r.date ?? r.label, { rejected: r.rejected ?? 0, deactivated: r.deactivated ?? 0 }]));
          const allLabels = [...new Set([
            ...(registrationsApproved ?? []).map((r: AnyData) => r.label as string),
            ...rejectedArr.map((r: AnyData) => (r.date ?? r.label) as string),
          ])].sort();
          const merged = allLabels.map((label) => ({
            label,
            approved: (approvedMap.get(label) ?? 0) as number,
            rejected: (rejectedMap.get(label)?.rejected ?? 0) as number,
            deactivated: (rejectedMap.get(label)?.deactivated ?? 0) as number,
          }));
          // 다중 라인을 MiniLineChart로 표현: 승인 데이터 메인 표시, 반려/비활성화는 바 차트로 보완
          // Multi-line via MiniLineChart: show approved as main, rejected/deactivated via bar chart complement
          return (
            <MiniBarChart
              data={merged.map((d) => ({
                label: d.label,
                values: [
                  { key: t('stats.registrationsApproved'), value: d.approved, color: CHART_COLORS.green },
                  { key: t('stats.rejected'), value: d.rejected, color: CHART_COLORS.red },
                  { key: t('stats.deactivated'), value: d.deactivated, color: CHART_COLORS.gray },
                ],
              }))}
              height={280}
              showLegend
            />
          );
        })() : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Role Distribution PieChart */}
      <ChartCard title={t('stats.userStats')} description={t('stats.desc.userRole')}>
        {roleData.reduce((sum, d) => sum + d.value, 0) > 0 ? (
          <div className="flex justify-center">
            <DonutChart data={roleData} size={220} />
          </div>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Status Distribution PieChart */}
      <ChartCard title={t('stats.userStatus')} description={t('stats.desc.userStatus')}>
        {statusData.reduce((sum, d) => sum + d.value, 0) > 0 ? (
          <div className="flex justify-center">
            <DonutChart data={statusData} size={220} />
          </div>
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
          <MiniLineChart
            data={(logins ?? []).map((d: AnyData) => ({ label: d.label, value: d.count }))}
            height={280}
            color={CHART_COLORS.red}
            name={t('stats.logins')}
          />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Page View Timeline */}
      <ChartCard title={t('stats.pageViews')} description={t('stats.desc.pageViews')}>
        {hasChartData(pageViews?.timeline) ? (
          <MiniBarChart
            data={(pageViews?.timeline ?? []).map((d: AnyData) => ({
              label: d.label,
              values: [{ key: t('stats.pageViews'), value: d.count, color: CHART_COLORS.green }],
            }))}
            height={280}
          />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Top Pages — 수평 바 차트를 MiniBarChart로 대체 / Horizontal bar chart replaced with MiniBarChart */}
      <ChartCard title={t('stats.topPages')} description={t('stats.desc.topPages')}>
        {hasChartData(topPagesData, 1) ? (
          <MiniBarChart
            data={topPagesData.map((d: AnyData) => ({
              label: d.path,
              values: [{ key: t('stats.pageViews'), value: d.views, color: CHART_COLORS.blue }],
            }))}
            height={280}
            horizontal
          />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Hourly Activity */}
      <ChartCard title={t('stats.hourlyActivity')} description={t('stats.desc.hourlyActivity')}>
        {hasChartData(hourlyData, 1) ? (
          <MiniBarChart
            data={hourlyData.map((d: AnyData) => ({
              label: d.label,
              values: [{ key: t('stats.hourlyActivity'), value: d.count, color: CHART_COLORS.purple }],
            }))}
            height={280}
          />
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
          <MiniBarChart
            data={(trading?.dailyVolume ?? []).map((d: AnyData) => ({
              label: d.date,
              values: [
                { key: t('stats.buy'), value: d.buy, color: CHART_COLORS.red },
                { key: t('stats.sell'), value: d.sell, color: CHART_COLORS.blue },
              ],
            }))}
            height={280}
            stacked
            showLegend
          />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Popular Assets — 수평 바 차트를 MiniBarChart로 대체 / Horizontal bar chart replaced with MiniBarChart */}
      <ChartCard title={t('stats.popularAssets')} description={t('stats.desc.popularAssets')}>
        {hasChartData(trading?.popularAssets, 1) ? (
          <MiniBarChart
            data={(trading?.popularAssets ?? []).map((d: AnyData) => ({
              label: d.symbol,
              values: [{ key: t('stats.totalVolume'), value: d.volume, color: CHART_COLORS.green }],
            }))}
            height={280}
            horizontal
          />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Buy/Sell Distribution */}
      <ChartCard title={t('stats.buySellDist')} description={t('stats.desc.buySellDist')}>
        {buySellData.reduce((sum: number, d: AnyData) => sum + d.value, 0) > 0 ? (
          <div className="flex justify-center">
            <DonutChart data={buySellData} size={220} />
          </div>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Popular Assets Volume Donut */}
      <ChartCard title={t('stats.popularAssetsDonut')} description={t('stats.desc.popularAssets')}>
        {trading?.popularAssets && trading.popularAssets.length > 0 ? (
          <div className="flex justify-center">
            <DonutChart
              data={trading.popularAssets.slice(0, 8).map((a: AnyData, i: number) => ({
                name: a.symbol,
                value: a.volume,
                color: Object.values(CHART_COLORS)[i % Object.values(CHART_COLORS).length] as string,
              }))}
              size={220}
            />
          </div>
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
          <MiniBarChart
            data={announcementChartData.map((d: AnyData) => ({
              label: d.date,
              values: [
                { key: t('stats.announcementStats'), value: d.announcements, color: CHART_COLORS.blue },
                { key: t('stats.comments'), value: d.comments, color: CHART_COLORS.red },
              ],
            }))}
            height={280}
            showLegend
          />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* 좋아요 추이 / Like trend */}
      <ChartCard title={t('stats.likeStats')} description={t('stats.desc.likeStats')}>
        {hasChartData(likeChartData) ? (
          <MiniBarChart
            data={likeChartData.map((d: AnyData) => ({
              label: d.date,
              values: [
                { key: t('stats.announcementLikes'), value: d.announcementLikes, color: CHART_COLORS.purple },
                { key: t('stats.commentLikes'), value: d.commentLikes, color: CHART_COLORS.yellow },
              ],
            }))}
            height={280}
            showLegend
          />
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
            <MiniLineChart
              data={chatStats.dailyMessages.map((d: AnyData) => ({ label: d.label, value: d.count }))}
              height={240}
              color={CHART_COLORS.blue}
              area
              name={t('stats.messages')}
            />
          ) : (
            <EmptyChart height={240} />
          )}
        </ChartCard>

        {/* 채팅방 유형 분포 / Room type distribution */}
        <ChartCard title={t('stats.roomDistribution')}>
          {chatStats && chatStats.totalRooms > 0 ? (
            <div className="flex justify-center">
              <DonutChart
                data={[
                  { name: t('stats.dm'), value: chatStats.dmCount, color: CHART_COLORS.blue },
                  { name: t('stats.group'), value: chatStats.groupCount, color: CHART_COLORS.green },
                ]}
                size={200}
              />
            </div>
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
  auditData?: { trades: AnyData[]; total: number; page: number; totalPages: number; limit?: number };
  auditPage: number;
  setAuditPage: (p: number) => void;
  auditFilters: { symbol: string; side: string; search: string };
  setAuditFilters: (f: { symbol: string; side: string; search: string }) => void;
  onLimitChange?: (limit: number) => void;
}

/** 감사 탭 — 주문 감사 로그 실시간 조회
 * Audit tab — real-time order audit log */
export function AuditTab({ t, auditData, auditPage, setAuditPage, auditFilters, setAuditFilters, onLimitChange }: AuditTabProps) {
  const trades = auditData?.trades ?? [];

  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-accent/5 border border-accent/20">
        <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <span className="text-[13px] text-text-secondary">
          {t('admin.stats.orderAudit.desc')}
        </span>
      </div>

      {/* 검색 / Search */}
      <div className="p-[1px]">
        <input
          type="text"
          value={auditFilters.search}
          onChange={(e) => { setAuditFilters({ ...auditFilters, search: e.target.value }); setAuditPage(1); }}
          placeholder={t('admin.stats.orderAudit.searchPlaceholder')}
          maxLength={100}
          className="w-full h-9 px-3.5 bg-bg-secondary border border-border rounded-xl text-[13px] text-text-primary placeholder:text-text-quaternary outline-none focus:border-accent/50 transition-colors"
        />
      </div>

      {/* Order audit table */}
      <div className="bg-bg-secondary rounded-2xl border border-border overflow-hidden">
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
              {trades.length > 0 ? trades.map((trade: AnyData) => (
                <tr key={trade.id} className="border-b border-border/40 hover:bg-bg-tertiary/30">
                  <td className="px-4 py-2.5 text-[12px] text-text-tertiary font-mono">{String(trade.id).slice(0, 8)}...</td>
                  <td className="px-4 py-2.5 text-[12px] text-text-secondary">{trade.username ?? String(trade.userId).slice(0, 8)}</td>
                  <td className="px-4 py-2.5 text-[12px] text-text-primary font-medium">{trade.symbol}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${trade.side === 'BUY' ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall'}`}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-text-primary text-right tabular-nums">{Number(trade.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                  <td className="px-4 py-2.5 text-[12px] text-text-primary text-right tabular-nums">${Number(trade.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2.5 text-center"><span className="px-2 py-0.5 rounded bg-success/10 text-success text-[11px] font-medium">{trade.status}</span></td>
                  <td className="px-4 py-2.5 text-[11px] text-text-quaternary text-right">{new Date(trade.executedAt).toLocaleString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-4 py-20 text-center text-[14px] text-text-quaternary">
                    {t('admin.stats.orderAudit.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile view */}
        <div className="sm:hidden space-y-2 p-3">
          {trades.length > 0 ? trades.map((trade: AnyData) => (
            <div key={trade.id} className="bg-bg-tertiary/30 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-text-primary">{trade.symbol}</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${trade.side === 'BUY' ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall'}`}>{trade.side}</span>
              </div>
              <div className="flex items-center justify-between text-[12px] text-text-tertiary">
                <span>{trade.username ?? String(trade.userId).slice(0, 8)}</span>
                <span className="tabular-nums">{Number(trade.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })} @ ${Number(trade.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="text-[11px] text-text-quaternary">{new Date(trade.executedAt).toLocaleString()}</div>
            </div>
          )) : (
            <div className="px-4 py-20 text-center text-[14px] text-text-quaternary">{t('admin.stats.orderAudit.noData')}</div>
          )}
        </div>
      </div>

      {/* Pagination — 공지사항과 동일 스타일 / Same style as announcements */}
      {auditData && auditData.totalPages > 0 && (
        <Pagination
          page={auditPage}
          totalPages={auditData.totalPages}
          total={auditData.total}
          limit={auditData.limit ?? 10}
          onPageChange={setAuditPage}
          onLimitChange={(n) => { onLimitChange?.(n); setAuditPage(1); }}
          limitOptions={[10, 50, 100]}
        />
      )}
    </div>
  );
}
