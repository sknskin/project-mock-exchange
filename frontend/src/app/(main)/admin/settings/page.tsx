/**
 * @file 관리자 시스템 설정 페이지
 * @description 거래 제한, 수수료, 시스템 상태, 초기 자금, 시장 운영시간, 리스크 관리, 알림, 세션/보안을 관리하는 관리자 전용 페이지
 *
 * @file Admin System Settings Page
 * @description Admin-only page for managing trading limits, fees, system status, initial balance, market hours, risk management, notifications, and session/security
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, AlertTriangle, Pencil, Save, X,
  TrendingUp, Percent, Power, Wallet, Clock, ShieldAlert, Bell, Lock,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import type { TranslationKey } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth';
import { useAdminSettingsStore } from '@/stores/adminSettings';
import { useToastStore } from '@/stores/toast';
import { cn } from '@/lib/format';
import api from '@/lib/api';
import Skeleton from '@/components/ui/Skeleton';

import Toggle from '@/components/ui/Toggle';

// ===== Number input field =====
function NumberField({
  label,
  value,
  onChange,
  step,
  min,
  max,
  suffix,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 py-3">
        <label className="text-[13px] text-text-secondary sm:w-52 sm:shrink-0">{label}</label>
        <span className="text-[14px] text-text-primary font-mono tabular-nums">
          {value.toLocaleString()}{suffix ? ` ${suffix}` : ''}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 py-3">
      <label className="text-[13px] text-text-secondary sm:w-52 sm:shrink-0">{label}</label>
      <div className="flex items-center gap-1 flex-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          step={step ?? 1}
          min={min ?? 0}
          max={max}
          className="w-full max-w-[220px] rounded-xl px-3 py-2 text-[14px] text-text-primary font-mono bg-bg-primary border border-border focus:border-accent/60 focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all"
        />
        {suffix && <span className="text-[12px] text-text-quaternary font-medium whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

// ===== Time input field =====
function TimeField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 py-3">
        <label className="text-[13px] text-text-secondary sm:w-52 sm:shrink-0">{label}</label>
        <span className="text-[14px] text-text-primary font-mono tabular-nums">{value}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 py-3">
      <label className="text-[13px] text-text-secondary sm:w-52 sm:shrink-0">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-[220px] rounded-xl px-3 py-2 text-[14px] text-text-primary font-mono bg-bg-primary border border-border focus:border-accent/60 focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all"
      />
    </div>
  );
}

// ===== Toggle row with label + description =====
function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  warning,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <div className="flex flex-col gap-0.5 pr-4">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-text-primary">{label}</span>
          {warning && checked && (
            <AlertTriangle className="w-4 h-4 text-warning" />
          )}
        </div>
        <span className="text-[12px] text-text-quaternary">{description}</span>
      </div>
      {disabled ? (
        <span className={cn(
          'text-[13px] font-medium px-2.5 py-0.5 rounded-lg',
          checked ? 'text-emerald-400 bg-emerald-400/10' : 'text-text-quaternary bg-bg-tertiary',
        )}>
          {checked ? 'ON' : 'OFF'}
        </span>
      ) : (
        <Toggle checked={checked} onChange={onChange} />
      )}
    </div>
  );
}

// ===== Section card =====
function SectionCard({
  icon: Icon,
  iconColor,
  titleKey,
  descKey,
  children,
  className,
  t,
}: {
  icon: LucideIcon;
  iconColor: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  children: React.ReactNode;
  className?: string;
  t: (key: TranslationKey) => string;
}) {
  return (
    <div className={cn('bg-bg-secondary rounded-2xl px-5 py-5', className)}>
      <div className="flex items-start gap-3 mb-4">
        <div className={cn('flex items-center justify-center w-9 h-9 rounded-xl shrink-0', iconColor)}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="text-[15px] font-bold text-text-primary">{t(titleKey)}</h2>
          <p className="text-[12px] text-text-quaternary leading-relaxed">{t(descKey)}</p>
        </div>
      </div>
      <div className="flex flex-col divide-y divide-border/40">{children}</div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const {
    tradingLimits,
    tradingFees,
    systemStatus,
    initialBalance,
    marketHours,
    riskManagement,
    notificationSettings,
    sessionSecurity,
    setTradingLimits,
    setTradingFees,
    setSystemStatus,
    setInitialBalance,
    setMarketHours,
    setRiskManagement,
    setNotificationSettings,
    setSessionSecurity,
  } = useAdminSettingsStore();

  const [editMode, setEditMode] = useState(false);
  const isSystem = user?.role === 'SYSTEM';

  // Local form state
  const [limits, setLimits] = useState(tradingLimits);
  const [fees, setFees] = useState(tradingFees);
  const [status, setStatus] = useState(systemStatus);
  const [balance, setBalance] = useState(initialBalance);
  const [hours, setHours] = useState(marketHours);
  const [risk, setRisk] = useState(riskManagement);
  const [notif, setNotif] = useState(notificationSettings);
  const [session, setSession] = useState(sessionSecurity);

  // Fetch settings from backend
  const { data: serverSettings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const res = await api.get('/api/admin/settings');
      return res.data?.data as Record<string, string> | undefined;
    },
    staleTime: 30_000,
  });

  // Helper: parse from server or fallback
  const p = (key: string, fallback: number) =>
    parseFloat(serverSettings?.[key] || '') || fallback;
  const pi = (key: string, fallback: number) =>
    parseInt(serverSettings?.[key] || '') || fallback;
  const pb = (key: string, fallback: boolean) =>
    serverSettings?.[key] !== undefined ? serverSettings[key] === 'true' : fallback;
  const ps = (key: string, fallback: string) =>
    serverSettings?.[key] || fallback;

  // Apply server settings on load
  useEffect(() => {
    if (serverSettings) {
      setLimits({
        minOrderQty: p('tradingLimits.minOrderQty', tradingLimits.minOrderQty),
        maxOrderQty: p('tradingLimits.maxOrderQty', tradingLimits.maxOrderQty),
        maxOpenOrdersPerUser: pi('tradingLimits.maxOpenOrdersPerUser', tradingLimits.maxOpenOrdersPerUser),
      });
      setFees({
        makerFee: p('tradingFees.makerFee', tradingFees.makerFee),
        takerFee: p('tradingFees.takerFee', tradingFees.takerFee),
      });
      setStatus({
        tradingEnabled: pb('systemStatus.tradingEnabled', systemStatus.tradingEnabled),
        maintenanceMode: pb('systemStatus.maintenanceMode', systemStatus.maintenanceMode),
      });
      setBalance({
        defaultBalance: p('initialBalance.defaultBalance', initialBalance.defaultBalance),
      });
      setHours({
        marketOpenTime: ps('marketHours.marketOpenTime', marketHours.marketOpenTime),
        marketCloseTime: ps('marketHours.marketCloseTime', marketHours.marketCloseTime),
        weekendTradingEnabled: pb('marketHours.weekendTradingEnabled', marketHours.weekendTradingEnabled),
      });
      setRisk({
        maxSingleOrderValue: p('riskManagement.maxSingleOrderValue', riskManagement.maxSingleOrderValue),
        dailyLossLimitPercent: p('riskManagement.dailyLossLimitPercent', riskManagement.dailyLossLimitPercent),
        marginCallThreshold: p('riskManagement.marginCallThreshold', riskManagement.marginCallThreshold),
      });
      setNotif({
        emailNotificationEnabled: pb('notificationSettings.emailNotificationEnabled', notificationSettings.emailNotificationEnabled),
        notificationRetentionDays: pi('notificationSettings.notificationRetentionDays', notificationSettings.notificationRetentionDays),
      });
      setSession({
        sessionTimeoutMinutes: pi('sessionSecurity.sessionTimeoutMinutes', sessionSecurity.sessionTimeoutMinutes),
        maxLoginAttempts: pi('sessionSecurity.maxLoginAttempts', sessionSecurity.maxLoginAttempts),
        require2FAForAdmin: pb('sessionSecurity.require2FAForAdmin', sessionSecurity.require2FAForAdmin),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSettings]);

  // Sync from store when no server settings
  useEffect(() => {
    if (!serverSettings) {
      setLimits(tradingLimits);
      setFees(tradingFees);
      setStatus(systemStatus);
      setBalance(initialBalance);
      setHours(marketHours);
      setRisk(riskManagement);
      setNotif(notificationSettings);
      setSession(sessionSecurity);
    }
  }, [tradingLimits, tradingFees, systemStatus, initialBalance, marketHours, riskManagement, notificationSettings, sessionSecurity, serverSettings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await api.put('/api/admin/settings', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      setEditMode(false);
      useToastStore.getState().addToast(t('admin.settings.saved'), 'success');
    },
    onError: () => {
      useToastStore.getState().addToast(t('admin.settings.saveFailed'), 'error');
    },
  });

  // Non-admin redirect
  useEffect(() => {
    if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
    return null;
  }

  const handleSave = () => {
    // Save to local store
    setTradingLimits(limits);
    setTradingFees(fees);
    setSystemStatus(status);
    setInitialBalance(balance);
    setMarketHours(hours);
    setRiskManagement(risk);
    setNotificationSettings(notif);
    setSessionSecurity(session);

    // Save to backend
    const payload: Record<string, string> = {
      'tradingLimits.minOrderQty': limits.minOrderQty.toString(),
      'tradingLimits.maxOrderQty': limits.maxOrderQty.toString(),
      'tradingLimits.maxOpenOrdersPerUser': limits.maxOpenOrdersPerUser.toString(),
      'tradingFees.makerFee': fees.makerFee.toString(),
      'tradingFees.takerFee': fees.takerFee.toString(),
      'systemStatus.tradingEnabled': status.tradingEnabled.toString(),
      'systemStatus.maintenanceMode': status.maintenanceMode.toString(),
      'initialBalance.defaultBalance': balance.defaultBalance.toString(),
      'marketHours.marketOpenTime': hours.marketOpenTime,
      'marketHours.marketCloseTime': hours.marketCloseTime,
      'marketHours.weekendTradingEnabled': hours.weekendTradingEnabled.toString(),
      'riskManagement.maxSingleOrderValue': risk.maxSingleOrderValue.toString(),
      'riskManagement.dailyLossLimitPercent': risk.dailyLossLimitPercent.toString(),
      'riskManagement.marginCallThreshold': risk.marginCallThreshold.toString(),
      'notificationSettings.emailNotificationEnabled': notif.emailNotificationEnabled.toString(),
      'notificationSettings.notificationRetentionDays': notif.notificationRetentionDays.toString(),
      'sessionSecurity.sessionTimeoutMinutes': session.sessionTimeoutMinutes.toString(),
      'sessionSecurity.maxLoginAttempts': session.maxLoginAttempts.toString(),
      'sessionSecurity.require2FAForAdmin': session.require2FAForAdmin.toString(),
    };
    saveMutation.mutate(payload);
  };

  const handleCancel = () => {
    // Revert to server values or store defaults
    if (serverSettings) {
      setLimits({
        minOrderQty: p('tradingLimits.minOrderQty', tradingLimits.minOrderQty),
        maxOrderQty: p('tradingLimits.maxOrderQty', tradingLimits.maxOrderQty),
        maxOpenOrdersPerUser: pi('tradingLimits.maxOpenOrdersPerUser', tradingLimits.maxOpenOrdersPerUser),
      });
      setFees({
        makerFee: p('tradingFees.makerFee', tradingFees.makerFee),
        takerFee: p('tradingFees.takerFee', tradingFees.takerFee),
      });
      setStatus({
        tradingEnabled: pb('systemStatus.tradingEnabled', systemStatus.tradingEnabled),
        maintenanceMode: pb('systemStatus.maintenanceMode', systemStatus.maintenanceMode),
      });
      setBalance({
        defaultBalance: p('initialBalance.defaultBalance', initialBalance.defaultBalance),
      });
      setHours({
        marketOpenTime: ps('marketHours.marketOpenTime', marketHours.marketOpenTime),
        marketCloseTime: ps('marketHours.marketCloseTime', marketHours.marketCloseTime),
        weekendTradingEnabled: pb('marketHours.weekendTradingEnabled', marketHours.weekendTradingEnabled),
      });
      setRisk({
        maxSingleOrderValue: p('riskManagement.maxSingleOrderValue', riskManagement.maxSingleOrderValue),
        dailyLossLimitPercent: p('riskManagement.dailyLossLimitPercent', riskManagement.dailyLossLimitPercent),
        marginCallThreshold: p('riskManagement.marginCallThreshold', riskManagement.marginCallThreshold),
      });
      setNotif({
        emailNotificationEnabled: pb('notificationSettings.emailNotificationEnabled', notificationSettings.emailNotificationEnabled),
        notificationRetentionDays: pi('notificationSettings.notificationRetentionDays', notificationSettings.notificationRetentionDays),
      });
      setSession({
        sessionTimeoutMinutes: pi('sessionSecurity.sessionTimeoutMinutes', sessionSecurity.sessionTimeoutMinutes),
        maxLoginAttempts: pi('sessionSecurity.maxLoginAttempts', sessionSecurity.maxLoginAttempts),
        require2FAForAdmin: pb('sessionSecurity.require2FAForAdmin', sessionSecurity.require2FAForAdmin),
      });
    } else {
      setLimits(tradingLimits);
      setFees(tradingFees);
      setStatus(systemStatus);
      setBalance(initialBalance);
      setHours(marketHours);
      setRisk(riskManagement);
      setNotif(notificationSettings);
      setSession(sessionSecurity);
    }
    setEditMode(false);
  };

  if (isLoading) {
    return (
      <div className="pb-16">
        <div className="py-6 flex items-center gap-2.5 h-[88px]">
          <Settings className="w-5 h-5 text-accent" />
          <h1 className="text-[20px] font-extrabold text-text-primary">{t('admin.settings.title')}</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="w-full h-56 rounded-2xl" />
          <Skeleton className="w-full h-56 rounded-2xl" />
          <Skeleton className="w-full h-40 rounded-2xl" />
          <Skeleton className="w-full h-40 rounded-2xl" />
          <Skeleton className="w-full h-48 rounded-2xl" />
          <Skeleton className="w-full h-48 rounded-2xl" />
          <Skeleton className="w-full h-40 rounded-2xl" />
          <Skeleton className="w-full h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* Page header */}
      <div className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-accent" />
            <h1 className="text-[20px] font-extrabold text-text-primary">
              {t('admin.settings.title')}
            </h1>
          </div>
          <p className="text-[13px] text-text-quaternary ml-[30px]">
            {t('admin.settings.subtitle')}
          </p>
        </div>
        {!editMode ? (
          <div className="flex flex-col items-end gap-1 self-start sm:self-auto">
            <button
              onClick={() => setEditMode(true)}
              disabled={!isSystem}
              className={cn(
                'flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-semibold transition-colors',
                isSystem
                  ? 'bg-accent/10 hover:bg-accent/20 text-accent'
                  : 'bg-bg-tertiary text-text-quaternary cursor-not-allowed',
              )}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t('admin.settings.edit')}
            </button>
            <span className="text-[11px] text-text-quaternary">
              {t('admin.settings.systemOnly')}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-bg-secondary hover:bg-bg-tertiary text-text-secondary text-[13px] font-semibold transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              {t('admin.settings.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-accent hover:bg-accent/90 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {t('admin.settings.save')}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Trading Limits */}
        <SectionCard
          icon={TrendingUp}
          iconColor="bg-blue-500/10 text-blue-500"
          titleKey="admin.settings.tradingLimits"
          descKey="admin.settings.tradingLimitsDesc"
          t={t}
        >
          <NumberField
            label={t('admin.settings.minOrderQty')}
            value={limits.minOrderQty}
            onChange={(v) => setLimits({ ...limits, minOrderQty: v })}
            step={0.001}
            min={0}
            disabled={!editMode}
          />
          <NumberField
            label={t('admin.settings.maxOrderQty')}
            value={limits.maxOrderQty}
            onChange={(v) => setLimits({ ...limits, maxOrderQty: v })}
            step={1}
            min={1}
            disabled={!editMode}
          />
          <NumberField
            label={t('admin.settings.maxOpenOrders')}
            value={limits.maxOpenOrdersPerUser}
            onChange={(v) => setLimits({ ...limits, maxOpenOrdersPerUser: v })}
            step={1}
            min={1}
            disabled={!editMode}
          />
        </SectionCard>

        {/* 2. Trading Fees */}
        <SectionCard
          icon={Percent}
          iconColor="bg-emerald-500/10 text-emerald-500"
          titleKey="admin.settings.tradingFees"
          descKey="admin.settings.tradingFeesDesc"
          t={t}
        >
          <NumberField
            label={t('admin.settings.makerFee')}
            value={fees.makerFee}
            onChange={(v) => setFees({ ...fees, makerFee: v })}
            step={0.01}
            min={0}
            suffix="%"
            disabled={!editMode}
          />
          <NumberField
            label={t('admin.settings.takerFee')}
            value={fees.takerFee}
            onChange={(v) => setFees({ ...fees, takerFee: v })}
            step={0.01}
            min={0}
            suffix="%"
            disabled={!editMode}
          />
        </SectionCard>

        {/* 3. Initial Balance */}
        <SectionCard
          icon={Wallet}
          iconColor="bg-amber-500/10 text-amber-500"
          titleKey="admin.settings.initialBalance"
          descKey="admin.settings.initialBalanceDesc"
          t={t}
        >
          <NumberField
            label={t('admin.settings.defaultBalance')}
            value={balance.defaultBalance}
            onChange={(v) => setBalance({ ...balance, defaultBalance: v })}
            step={1_000_000}
            min={0}
            suffix={t('admin.settings.defaultBalanceSuffix')}
            disabled={!editMode}
          />
        </SectionCard>

        {/* 4. Market Hours */}
        <SectionCard
          icon={Clock}
          iconColor="bg-violet-500/10 text-violet-500"
          titleKey="admin.settings.marketHours"
          descKey="admin.settings.marketHoursDesc"
          t={t}
        >
          <TimeField
            label={t('admin.settings.marketOpenTime')}
            value={hours.marketOpenTime}
            onChange={(v) => setHours({ ...hours, marketOpenTime: v })}
            disabled={!editMode}
          />
          <TimeField
            label={t('admin.settings.marketCloseTime')}
            value={hours.marketCloseTime}
            onChange={(v) => setHours({ ...hours, marketCloseTime: v })}
            disabled={!editMode}
          />
          <ToggleRow
            label={t('admin.settings.weekendTrading')}
            description={t('admin.settings.weekendTradingDesc')}
            checked={hours.weekendTradingEnabled}
            onChange={(v) => setHours({ ...hours, weekendTradingEnabled: v })}
            disabled={!editMode}
          />
        </SectionCard>

        {/* 5. Risk Management */}
        <SectionCard
          icon={ShieldAlert}
          iconColor="bg-rose-500/10 text-rose-500"
          titleKey="admin.settings.riskManagement"
          descKey="admin.settings.riskManagementDesc"
          t={t}
        >
          <NumberField
            label={t('admin.settings.maxSingleOrderValue')}
            value={risk.maxSingleOrderValue}
            onChange={(v) => setRisk({ ...risk, maxSingleOrderValue: v })}
            step={1_000_000}
            min={0}
            suffix={t('admin.settings.defaultBalanceSuffix')}
            disabled={!editMode}
          />
          <NumberField
            label={t('admin.settings.dailyLossLimit')}
            value={risk.dailyLossLimitPercent}
            onChange={(v) => setRisk({ ...risk, dailyLossLimitPercent: v })}
            step={1}
            min={1}
            max={100}
            suffix="%"
            disabled={!editMode}
          />
          <NumberField
            label={t('admin.settings.marginCallThreshold')}
            value={risk.marginCallThreshold}
            onChange={(v) => setRisk({ ...risk, marginCallThreshold: v })}
            step={1}
            min={0}
            max={100}
            suffix="%"
            disabled={!editMode}
          />
        </SectionCard>

        {/* 6. Notifications */}
        <SectionCard
          icon={Bell}
          iconColor="bg-orange-500/10 text-orange-500"
          titleKey="admin.settings.notifications"
          descKey="admin.settings.notificationsDesc"
          t={t}
        >
          <ToggleRow
            label={t('admin.settings.emailNotification')}
            description={t('admin.settings.emailNotificationDesc')}
            checked={notif.emailNotificationEnabled}
            onChange={(v) => setNotif({ ...notif, emailNotificationEnabled: v })}
            disabled={!editMode}
          />
          <NumberField
            label={t('admin.settings.notificationRetention')}
            value={notif.notificationRetentionDays}
            onChange={(v) => setNotif({ ...notif, notificationRetentionDays: v })}
            step={1}
            min={1}
            suffix={t('admin.settings.notificationRetentionSuffix')}
            disabled={!editMode}
          />
        </SectionCard>

        {/* 7. System Status — full width */}
        <SectionCard
          icon={Power}
          iconColor="bg-teal-500/10 text-teal-500"
          titleKey="admin.settings.systemStatus"
          descKey="admin.settings.systemStatusDesc"
          className="lg:col-span-2"
          t={t}
        >
          <ToggleRow
            label={t('admin.settings.tradingEnabled')}
            description={t('admin.settings.tradingEnabledDesc')}
            checked={status.tradingEnabled}
            onChange={(v) => setStatus({ ...status, tradingEnabled: v })}
            disabled={!editMode}
          />
          <ToggleRow
            label={t('admin.settings.maintenanceMode')}
            description={t('admin.settings.maintenanceModeDesc')}
            checked={status.maintenanceMode}
            onChange={(v) => setStatus({ ...status, maintenanceMode: v })}
            disabled={!editMode}
            warning
          />
        </SectionCard>

        {/* 8. Session / Security — full width */}
        <SectionCard
          icon={Lock}
          iconColor="bg-indigo-500/10 text-indigo-500"
          titleKey="admin.settings.sessionSecurity"
          descKey="admin.settings.sessionSecurityDesc"
          className="lg:col-span-2"
          t={t}
        >
          <NumberField
            label={t('admin.settings.sessionTimeout')}
            value={session.sessionTimeoutMinutes}
            onChange={(v) => setSession({ ...session, sessionTimeoutMinutes: v })}
            step={5}
            min={5}
            suffix={t('admin.settings.sessionTimeoutSuffix')}
            disabled={!editMode}
          />
          <NumberField
            label={t('admin.settings.maxLoginAttempts')}
            value={session.maxLoginAttempts}
            onChange={(v) => setSession({ ...session, maxLoginAttempts: v })}
            step={1}
            min={1}
            max={20}
            suffix={t('admin.settings.maxLoginAttemptsSuffix')}
            disabled={!editMode}
          />
          <ToggleRow
            label={t('admin.settings.require2FA')}
            description={t('admin.settings.require2FADesc')}
            checked={session.require2FAForAdmin}
            onChange={(v) => setSession({ ...session, require2FAForAdmin: v })}
            disabled={!editMode}
          />
        </SectionCard>
      </div>
    </div>
  );
}
