/**
 * @file 프로필 섹션 컴포넌트
 * @description 기본 정보 + 계정 정보 + 거래 통계 + 최근 거래 + 계정 활동 표시
 *
 * @file Profile Section Component
 * @description Displays basic info + account info + trading stats + recent trades + account activity
 */
'use client';

import { useMemo } from 'react';
import { BarChart3, Activity, Clock } from 'lucide-react';
import { cn } from '@/lib/format';
import type { TranslationKey } from '@/lib/i18n';
import type { TradeHistory } from '@/hooks/useOrders';

// 레이블-값 한 쌍을 표시하는 재사용 행 컴포넌트 / Reusable label-value row component for info display
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5">
      <span className="text-[13px] text-text-tertiary sm:w-28 sm:shrink-0">{label}</span>
      <span className="text-[14px] text-text-primary font-medium break-all">{children}</span>
    </div>
  );
}

// 역할(권한) 뱃지 — SYSTEM(보라), ADMIN(액센트), USER(기본) / Role badge — SYSTEM(purple), ADMIN(accent), USER(default)
function RoleBadge({ role, t }: { role: string; t: (key: TranslationKey) => string }) {
  if (role === 'SYSTEM') {
    return (
      <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
        {t('common.system')}
      </span>
    );
  }
  if (role === 'ADMIN') {
    return (
      <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-accent/15 text-accent">
        {t('common.admin')}
      </span>
    );
  }
  return (
    <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-bg-tertiary text-text-secondary">
      {t('common.user')}
    </span>
  );
}

interface ProfileData {
  name?: string;
  email?: string;
  username?: string;
  phone?: string;
  address?: string;
  addressDetail?: string | null;
  zipCode?: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  approvalStatus?: string;
  isActive?: boolean;
}

interface ProfileSectionProps {
  profile: ProfileData;
  trades: TradeHistory[] | undefined;
  userId: string | undefined;
  locale: string;
  t: (key: TranslationKey) => string;
}

/**
 * 프로필 섹션 — 기본 정보, 계정 정보, 거래 통계, 최근 거래, 활동 내역
 * Profile section — basic info, account info, trading stats, recent trades, activity
 */
export default function ProfileSection({ profile, trades, userId, locale, t }: ProfileSectionProps) {
  const formatJoinDate = (value: string | null | undefined): string => {
    if (!value) return '-';
    return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  /**
   * 거래 통계 집계 (메모이제이션) — 총 거래수, 총 거래량, 최고 수익률
   * 최고 수익률: 종목별 평균가 대비 각 거래의 수익률을 계산하여 최대값 추출
   *
   * Trading stats aggregation (memoized) — total trades, total volume, best PnL %
   * Best PnL: calculates each trade's return vs symbol avg price, takes the maximum
   */
  const tradingStats = useMemo(() => {
    if (!trades || trades.length === 0) return null;
    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum, t) => sum + t.total, 0);

    let bestPnl = 0;
    const symbolTrades: Record<string, number[]> = {};
    for (const trade of trades) {
      if (!symbolTrades[trade.symbol]) symbolTrades[trade.symbol] = [];
      symbolTrades[trade.symbol].push(trade.price);
    }
    for (const trade of trades) {
      const prices = symbolTrades[trade.symbol];
      if (prices.length < 2) continue;
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const isBuy = trade.buyerId === userId;
      // 매수: 평균가보다 낮게 샀으면 이익 / 매도: 평균가보다 높게 팔았으면 이익
      // Buy: profit if bought below avg / Sell: profit if sold above avg
      const pnlPct = isBuy
        ? ((avgPrice - trade.price) / trade.price) * 100
        : ((trade.price - avgPrice) / avgPrice) * 100;
      if (pnlPct > bestPnl) bestPnl = pnlPct;
    }

    return { totalTrades, totalVolume, bestPnl };
  }, [trades, userId]);

  return (
    <>
      {/* Basic Info */}
      <div className="bg-bg-secondary rounded-2xl px-5 py-4">
        <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide mb-2">
          {t('admin.users.basicInfo')}
        </h2>
        <div className="flex flex-col divide-y divide-border/40">
          <InfoRow label={t('mypage.name')}>{profile.name || '-'}</InfoRow>
          <InfoRow label={t('mypage.email')}>{profile.email || '-'}</InfoRow>
          <InfoRow label={t('mypage.username')}>
            <span className="font-mono">{profile.username || '-'}</span>
          </InfoRow>
          <InfoRow label={t('mypage.phone')}>{profile.phone || '-'}</InfoRow>
          <InfoRow label={t('mypage.address')}>
            {profile.address || profile.addressDetail ? (
              <span className="flex flex-col gap-0.5">
                {profile.address && <span>{profile.address}{profile.zipCode ? ` (${profile.zipCode})` : ''}</span>}
                {profile.addressDetail && <span className="text-text-secondary">{profile.addressDetail}</span>}
              </span>
            ) : '-'}
          </InfoRow>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-bg-secondary rounded-2xl px-5 py-4">
        <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide mb-2">
          {t('admin.users.accountInfo')}
        </h2>
        <div className="flex flex-col divide-y divide-border/40">
          <InfoRow label={t('mypage.role')}>
            <RoleBadge role={profile.role} t={t} />
          </InfoRow>
          <InfoRow label={t('mypage.joinDate')}>
            {formatJoinDate(profile.createdAt)}
          </InfoRow>
        </div>
      </div>

      {/* Trading Statistics */}
      <div className="bg-bg-secondary rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-3.5 h-3.5 text-text-tertiary" />
          <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide">
            {t('mypage.tradingStats')}
          </h2>
        </div>
        {tradingStats ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-tertiary/50 rounded-xl px-4 py-3">
              <p className="text-[11px] text-text-quaternary mb-1">{t('mypage.totalTrades')}</p>
              <p className="text-[18px] font-bold text-text-primary">
                {tradingStats.totalTrades.toLocaleString()}
                <span className="text-[12px] font-normal text-text-tertiary ml-1">{t('mypage.trades')}</span>
              </p>
            </div>
            <div className="bg-bg-tertiary/50 rounded-xl px-4 py-3">
              <p className="text-[11px] text-text-quaternary mb-1">{t('mypage.totalVolume')}</p>
              <p className="text-[18px] font-bold text-text-primary">
                ${tradingStats.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-bg-tertiary/50 rounded-xl px-4 py-3">
              <p className="text-[11px] text-text-quaternary mb-1">{t('mypage.accountAge')}</p>
              <p className="text-[18px] font-bold text-text-primary">
                {profile.createdAt
                  ? t('mypage.accountAgeDays').replace(
                      '{days}',
                      String(Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / 86400000)),
                    )
                  : '-'}
              </p>
            </div>
            <div className="bg-bg-tertiary/50 rounded-xl px-4 py-3">
              <p className="text-[11px] text-text-quaternary mb-1">{t('mypage.bestTradePnl')}</p>
              <p className={cn(
                'text-[18px] font-bold',
                tradingStats.bestPnl > 0 ? 'text-green-400' : 'text-text-primary',
              )}>
                {tradingStats.bestPnl > 0 ? '+' : ''}{tradingStats.bestPnl.toFixed(2)}%
              </p>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-text-quaternary text-[13px]">
            {t('mypage.noTrades')}
          </div>
        )}
      </div>

      {/* Account Activity */}
      <div className="bg-bg-secondary rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-3.5 h-3.5 text-text-tertiary" />
          <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide">
            {t('mypage.accountActivity')}
          </h2>
        </div>
        <div className="flex flex-col divide-y divide-border/40">
          <InfoRow label={t('mypage.accountCreated')}>
            {formatJoinDate(profile.createdAt)}
          </InfoRow>
          <InfoRow label={t('mypage.lastUpdated')}>
            {formatJoinDate(profile.updatedAt)}
          </InfoRow>
          <InfoRow label={t('mypage.approvalStatus')}>
            <span className={cn(
              'text-[13px] font-semibold px-2.5 py-0.5 rounded-full',
              profile.approvalStatus === 'APPROVED'
                ? 'bg-green-500/15 text-green-400'
                : profile.approvalStatus === 'PENDING'
                  ? 'bg-yellow-500/15 text-yellow-400'
                  : 'bg-danger/15 text-danger',
            )}>
              {profile.approvalStatus === 'APPROVED'
                ? t('mypage.approvalStatus.APPROVED')
                : profile.approvalStatus === 'PENDING'
                  ? t('mypage.approvalStatus.PENDING')
                  : t('mypage.approvalStatus.REJECTED')}
            </span>
          </InfoRow>
          <InfoRow label={t('mypage.accountStatus')}>
            <span className={cn(
              'text-[13px] font-semibold px-2.5 py-0.5 rounded-full',
              profile.isActive
                ? 'bg-green-500/15 text-green-400'
                : 'bg-danger/15 text-danger',
            )}>
              {profile.isActive ? t('mypage.accountActive') : t('mypage.accountInactive')}
            </span>
          </InfoRow>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="bg-bg-secondary rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-3.5 h-3.5 text-text-tertiary" />
          <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide">
            {t('mypage.recentTrades')}
          </h2>
        </div>
        {trades && trades.length > 0 ? (
          <div className="flex flex-col divide-y divide-border/40">
            {trades.slice(0, 5).map((trade, i) => {
              const isBuy = trade.buyerId === userId;
              return (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn(
                      'text-[11px] font-bold px-1.5 py-0.5 rounded',
                      isBuy ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall',
                    )}>
                      {isBuy ? 'BUY' : 'SELL'}
                    </span>
                    <span className="text-[13px] font-semibold text-text-primary truncate">{trade.symbol}</span>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-[13px] font-mono text-text-primary tabular-nums">
                      ${trade.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-text-quaternary tabular-nums">
                      {trade.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-text-quaternary text-[13px]">
            {t('mypage.noTrades')}
          </div>
        )}
      </div>
    </>
  );
}
