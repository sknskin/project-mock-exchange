/**
 * @file 마이페이지
 * @description 사용자 프로필 조회 및 비밀번호 변경 페이지 (회원관리 상세 스타일)
 *
 * @file My Page
 * @description User profile view and password change page (admin user detail style)
 */
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Edit2, User, Bell, BarChart3, Activity, Clock, Shield } from 'lucide-react';
import { useProfile, useChangePassword } from '@/hooks/useAdmin';
import { useTradeHistory } from '@/hooks/useOrders';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore, type NotificationPrefs } from '@/stores/settings';
import { useToastStore } from '@/stores/toast';
import { cn } from '@/lib/format';
import api from '@/lib/api';

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5">
      <span className="text-[13px] text-text-tertiary sm:w-28 sm:shrink-0">{label}</span>
      <span className="text-[14px] text-text-primary font-medium break-all">{children}</span>
    </div>
  );
}

function RoleBadge({ role, t }: { role: string; t: (key: Parameters<ReturnType<typeof useTranslation>['t']>[0]) => string }) {
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

function NotifToggle({ label, prefKey }: { label: string; prefKey: keyof NotificationPrefs }) {
  const { t } = useTranslation();
  const value = useSettingsStore((s) => s.notificationPrefs[prefKey]);
  const setPref = useSettingsStore((s) => s.setNotificationPref);

  const handleToggle = async () => {
    const newValue = !value;
    // Optimistic update
    setPref(prefKey, newValue);

    try {
      await api.put('/api/user/notification-settings', {
        [`notif.${prefKey}`]: newValue.toString(),
      });
    } catch {
      // Rollback on failure
      setPref(prefKey, value);
      useToastStore.getState().addToast(t('mypage.notificationSaveFailed'), 'error');
    }
  };

  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[14px] text-text-primary">{label}</span>
      <button
        onClick={handleToggle}
        aria-label={label}
        className={cn(
          'relative w-10 h-[22px] rounded-full transition-colors',
          value ? 'bg-accent' : 'bg-bg-tertiary',
        )}
      >
        <span className={cn(
          'absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform',
          value ? 'left-[22px]' : 'left-[3px]',
        )} />
      </button>
    </div>
  );
}

export default function MyPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const { data: profile, isLoading } = useProfile();
  const changePassword = useChangePassword();
  const { data: trades } = useTradeHistory();
  const user = useAuthStore((s) => s.user);

  const tradingStats = useMemo(() => {
    if (!trades || trades.length === 0) return null;
    const userId = user?.id;
    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum, t) => sum + t.total, 0);

    // Calculate best trade PnL% (simplified: compare each trade price to average price for that symbol)
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
      // For buy trades: profit if price < avg (bought low); for sell: profit if price > avg (sold high)
      const pnlPct = isBuy
        ? ((avgPrice - trade.price) / trade.price) * 100
        : ((trade.price - avgPrice) / avgPrice) * 100;
      if (pnlPct > bestPnl) bestPnl = pnlPct;
    }

    return { totalTrades, totalVolume, bestPnl };
  }, [trades, user?.id]);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);

  const passwordModalRef = useRef<HTMLDivElement>(null);
  const handlePasswordModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const modal = passwordModalRef.current;
    if (!modal) return;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  const handleOpenPasswordModal = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setPasswordSuccess('');
    setIsPasswordModalOpen(true);
  };

  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleChangePassword = () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword.trim()) {
      setPasswordError(t('mypage.currentPasswordRequired'));
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError(t('validation.password.minLength'));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('validation.passwordConfirm.match'));
      return;
    }

    setConfirmPasswordOpen(true);
  };

  const handleConfirmChangePassword = async () => {
    setConfirmPasswordOpen(false);
    try {
      await changePassword.mutateAsync(passwordForm);
      setPasswordSuccess(t('mypage.passwordChanged'));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      setPasswordError(t('mypage.passwordError'));
    }
  };

  const formatJoinDate = (value: string | null | undefined): string => {
    if (!value) return '-';
    return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (!isAuthenticated) return null;

  return (
    <div className="pb-24">
      {/* Page header */}
      <div className="py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <User className="w-5 h-5 text-accent" />
          <h1 className="text-[20px] font-extrabold text-text-primary">
            {t('mypage.title')}
          </h1>
        </div>
        <Link
          href="/mypage/edit"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-[13px] font-semibold transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          {t('mypage.edit')}
        </Link>
      </div>

      {isLoading && (
        <div className="py-20 text-center text-text-quaternary text-[14px]">
          {t('common.loading')}
        </div>
      )}

      {!isLoading && profile && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

          {/* Notification Preferences */}
          <div className="bg-bg-secondary rounded-2xl px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-3.5 h-3.5 text-text-tertiary" />
              <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide">
                {t('mypage.notificationPrefs')}
              </h2>
            </div>
            <div className="flex flex-col divide-y divide-border/40">
              <NotifToggle label={t('mypage.notif.trade')} prefKey="trade" />
              <NotifToggle label={t('mypage.notif.priceAlert')} prefKey="priceAlert" />
              <NotifToggle label={t('mypage.notif.chat')} prefKey="chat" />
              <NotifToggle label={t('mypage.notif.announcement')} prefKey="announcement" />
              <NotifToggle label={t('mypage.notif.registration')} prefKey="registration" />
            </div>
          </div>

          {/* Password change */}
          <div className="bg-bg-secondary rounded-2xl px-5 py-4">
            <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide mb-3">
              {t('mypage.changePassword')}
            </h2>
            <button
              onClick={handleOpenPasswordModal}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-border text-[14px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              <Lock className="w-4 h-4" />
              {t('mypage.changePassword')}
            </button>
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
                  const isBuy = trade.buyerId === user?.id;
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

          {/* Security Info */}
          <div className="bg-bg-secondary rounded-2xl px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5 text-text-tertiary" />
              <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide">
                {t('mypage.securityInfo')}
              </h2>
            </div>
            <div className="flex flex-col divide-y divide-border/40">
              <InfoRow label={t('mypage.twoFactor')}>
                <span className={cn(
                  'text-[13px] font-semibold px-2.5 py-0.5 rounded-full',
                  profile.totpEnabled
                    ? 'bg-green-500/15 text-green-400'
                    : 'bg-bg-tertiary text-text-quaternary',
                )}>
                  {profile.totpEnabled ? t('mypage.twoFactorEnabled') : t('mypage.twoFactorDisabled')}
                </span>
              </InfoRow>
              <InfoRow label={t('mypage.smsAuth')}>
                <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-400">
                  {t('mypage.smsAuthEnabled')}
                </span>
              </InfoRow>
              <InfoRow label={t('mypage.identityVerification')}>
                <span className={cn(
                  'text-[13px] font-semibold px-2.5 py-0.5 rounded-full',
                  profile.encryptedRrn
                    ? 'bg-green-500/15 text-green-400'
                    : 'bg-yellow-500/15 text-yellow-400',
                )}>
                  {profile.encryptedRrn ? t('mypage.identityVerified') : t('mypage.identityUnverified')}
                </span>
              </InfoRow>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={handleClosePasswordModal}
          />
          <div className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none px-4">
            <div ref={passwordModalRef} onKeyDown={handlePasswordModalKeyDown} className="relative bg-bg-primary border border-border rounded-2xl p-6 w-full max-w-[min(360px,calc(100vw-2rem))] shadow-2xl pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby="password-modal-title">
              <div className="flex items-center justify-between mb-5">
                <h3 id="password-modal-title" className="text-[16px] font-bold text-text-primary">
                  {t('mypage.changePassword')}
                </h3>
                <button
                  onClick={handleClosePasswordModal}
                  className="p-1 rounded-lg text-text-quaternary hover:text-text-primary transition-colors text-[18px] font-bold"
                >
                  ✕
                </button>
              </div>

              {passwordSuccess && (
                <div className="mb-4 rounded-xl px-4 py-3 bg-green-500/10 border border-green-500/20 text-[13px] text-green-400 font-medium">
                  {passwordSuccess}
                </div>
              )}
              {passwordError && (
                <div className="mb-4 rounded-xl px-4 py-3 bg-danger/10 border border-danger/20 text-[13px] text-danger font-medium">
                  {passwordError}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-text-tertiary">
                    {t('mypage.currentPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                    }
                    autoComplete="current-password"
                    className="bg-bg-secondary border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-text-tertiary">
                    {t('mypage.newPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                    }
                    autoComplete="new-password"
                    className={cn(
                      'bg-bg-secondary border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none transition-colors',
                      passwordForm.newPassword.length > 0 && passwordForm.newPassword.length < 8
                        ? 'border-danger/60 focus:border-danger'
                        : 'border-border focus:border-accent/60',
                    )}
                  />
                  {passwordForm.newPassword.length > 0 && passwordForm.newPassword.length < 8 && (
                    <p className="text-[12px] text-danger">{t('validation.password.minLength')}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-text-tertiary">
                    {t('mypage.confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                    }
                    autoComplete="new-password"
                    className={cn(
                      'bg-bg-secondary border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none transition-colors',
                      passwordForm.confirmPassword.length > 0 &&
                        passwordForm.newPassword !== passwordForm.confirmPassword
                        ? 'border-danger/60 focus:border-danger'
                        : passwordForm.confirmPassword.length > 0 &&
                            passwordForm.newPassword === passwordForm.confirmPassword
                          ? 'border-green-500/60 focus:border-green-500'
                          : 'border-border focus:border-accent/60',
                    )}
                  />
                  {passwordForm.confirmPassword.length > 0 && (
                    <p
                      className={cn(
                        'text-[12px]',
                        passwordForm.newPassword === passwordForm.confirmPassword
                          ? 'text-green-400'
                          : 'text-danger',
                      )}
                    >
                      {passwordForm.newPassword === passwordForm.confirmPassword
                        ? t('validation.passwordConfirm.ok')
                        : t('validation.passwordConfirm.match')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleChangePassword}
                  disabled={changePassword.isPending}
                  className="flex-1 h-11 rounded-xl bg-accent hover:bg-accent/90 text-white text-[14px] font-semibold transition-colors disabled:opacity-50"
                >
                  {changePassword.isPending ? '...' : t('mypage.save')}
                </button>
                <button
                  onClick={handleClosePasswordModal}
                  disabled={changePassword.isPending}
                  className="flex-1 h-11 rounded-xl border border-border text-[14px] font-semibold text-text-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50"
                >
                  {t('mypage.cancel')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 비밀번호 변경 최종 확인 모달 (강력한 경고) */}
      {confirmPasswordOpen && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/70" onClick={() => setConfirmPasswordOpen(false)} />
          <div className="fixed inset-0 z-[71] flex items-center justify-center pointer-events-none px-4">
            <div className="relative bg-bg-primary border border-danger/30 rounded-2xl p-6 w-full max-w-[min(380px,calc(100vw-2rem))] shadow-2xl pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby="confirm-password-modal-title">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-danger/15 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-danger" />
                </div>
                <h3 id="confirm-password-modal-title" className="text-[16px] font-bold text-text-primary">
                  {t('mypage.confirmPasswordChange')}
                </h3>
              </div>
              <p className="text-[13px] text-text-tertiary leading-relaxed mb-6">
                {t('mypage.confirmPasswordChangeDesc')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmChangePassword}
                  disabled={changePassword.isPending}
                  className="flex-1 h-11 rounded-xl bg-danger hover:bg-danger/90 text-white text-[14px] font-bold transition-colors disabled:opacity-50"
                >
                  {changePassword.isPending ? '...' : t('mypage.confirm')}
                </button>
                <button
                  onClick={() => setConfirmPasswordOpen(false)}
                  disabled={changePassword.isPending}
                  className="flex-1 h-11 rounded-xl border border-border text-[14px] font-semibold text-text-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50"
                >
                  {t('mypage.cancel')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
