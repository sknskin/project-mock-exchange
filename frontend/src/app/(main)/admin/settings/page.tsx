/**
 * @file 관리자 시스템 설정 페이지
 * @description 거래 제한, 수수료, 시스템 상태 토글을 관리하는 관리자 전용 페이지
 *
 * @file Admin System Settings Page
 * @description Admin-only page for managing trading limits, fees, and system status toggles
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, AlertTriangle, Pencil, Save, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { useAdminSettingsStore } from '@/stores/adminSettings';
import { useToastStore } from '@/stores/toast';
import { cn } from '@/lib/format';
import api from '@/lib/api';
import Skeleton from '@/components/ui/Skeleton';

// ===== Toggle switch =====
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-accent' : 'bg-bg-tertiary border border-border',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

// ===== Number input field =====
function NumberField({
  label,
  value,
  onChange,
  step,
  min,
  suffix,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3">
      <label className="text-[13px] text-text-tertiary sm:w-48 sm:shrink-0">{label}</label>
      <div className="flex items-center gap-2 flex-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          step={step ?? 1}
          min={min ?? 0}
          disabled={disabled}
          className={cn(
            'w-full max-w-[200px] rounded-xl px-3 py-2.5 text-[14px] text-text-primary font-mono focus:outline-none transition-colors',
            disabled
              ? 'bg-transparent border-transparent cursor-default'
              : 'bg-bg-secondary border border-border focus:border-accent/60',
          )}
        />
        {suffix && <span className="text-[12px] text-text-quaternary">{suffix}</span>}
      </div>
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
    setTradingLimits,
    setTradingFees,
    setSystemStatus,
  } = useAdminSettingsStore();

  const [editMode, setEditMode] = useState(false);

  // Local form state
  const [limits, setLimits] = useState(tradingLimits);
  const [fees, setFees] = useState(tradingFees);
  const [status, setStatus] = useState(systemStatus);

  // Fetch settings from backend
  const { data: serverSettings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const res = await api.get('/api/admin/settings');
      return res.data?.data as Record<string, string> | undefined;
    },
    staleTime: 30_000,
  });

  // Apply server settings on load
  useEffect(() => {
    if (serverSettings) {
      const fromServer = {
        limits: {
          minOrderQty: parseFloat(serverSettings['tradingLimits.minOrderQty'] || '') || tradingLimits.minOrderQty,
          maxOrderQty: parseFloat(serverSettings['tradingLimits.maxOrderQty'] || '') || tradingLimits.maxOrderQty,
          maxOpenOrdersPerUser: parseInt(serverSettings['tradingLimits.maxOpenOrdersPerUser'] || '') || tradingLimits.maxOpenOrdersPerUser,
        },
        fees: {
          makerFee: parseFloat(serverSettings['tradingFees.makerFee'] || '') || tradingFees.makerFee,
          takerFee: parseFloat(serverSettings['tradingFees.takerFee'] || '') || tradingFees.takerFee,
        },
        status: {
          tradingEnabled: serverSettings['systemStatus.tradingEnabled'] === 'true' || (serverSettings['systemStatus.tradingEnabled'] === undefined && systemStatus.tradingEnabled),
          maintenanceMode: serverSettings['systemStatus.maintenanceMode'] === 'true',
        },
      };
      setLimits(fromServer.limits);
      setFees(fromServer.fees);
      setStatus(fromServer.status);
    }
  }, [serverSettings]);

  // Sync from store when no server settings
  useEffect(() => {
    if (!serverSettings) {
      setLimits(tradingLimits);
      setFees(tradingFees);
      setStatus(systemStatus);
    }
  }, [tradingLimits, tradingFees, systemStatus, serverSettings]);

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

    // Save to backend
    const payload: Record<string, string> = {
      'tradingLimits.minOrderQty': limits.minOrderQty.toString(),
      'tradingLimits.maxOrderQty': limits.maxOrderQty.toString(),
      'tradingLimits.maxOpenOrdersPerUser': limits.maxOpenOrdersPerUser.toString(),
      'tradingFees.makerFee': fees.makerFee.toString(),
      'tradingFees.takerFee': fees.takerFee.toString(),
      'systemStatus.tradingEnabled': status.tradingEnabled.toString(),
      'systemStatus.maintenanceMode': status.maintenanceMode.toString(),
    };
    saveMutation.mutate(payload);
  };

  const handleCancel = () => {
    // Revert to store values
    if (serverSettings) {
      setLimits({
        minOrderQty: parseFloat(serverSettings['tradingLimits.minOrderQty'] || '') || tradingLimits.minOrderQty,
        maxOrderQty: parseFloat(serverSettings['tradingLimits.maxOrderQty'] || '') || tradingLimits.maxOrderQty,
        maxOpenOrdersPerUser: parseInt(serverSettings['tradingLimits.maxOpenOrdersPerUser'] || '') || tradingLimits.maxOpenOrdersPerUser,
      });
      setFees({
        makerFee: parseFloat(serverSettings['tradingFees.makerFee'] || '') || tradingFees.makerFee,
        takerFee: parseFloat(serverSettings['tradingFees.takerFee'] || '') || tradingFees.takerFee,
      });
      setStatus({
        tradingEnabled: serverSettings['systemStatus.tradingEnabled'] === 'true' || (serverSettings['systemStatus.tradingEnabled'] === undefined && systemStatus.tradingEnabled),
        maintenanceMode: serverSettings['systemStatus.maintenanceMode'] === 'true',
      });
    } else {
      setLimits(tradingLimits);
      setFees(tradingFees);
      setStatus(systemStatus);
    }
    setEditMode(false);
  };

  if (isLoading) {
    return (
      <div className="pb-16">
        <div className="py-6 flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-accent" />
          <h1 className="text-[20px] font-extrabold text-text-primary">{t('admin.settings.title')}</h1>
        </div>
        <div className="space-y-4">
          <Skeleton className="w-full h-48 rounded-2xl" />
          <Skeleton className="w-full h-48 rounded-2xl" />
          <Skeleton className="w-full h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* Page header */}
      <div className="py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-accent" />
          <h1 className="text-[20px] font-extrabold text-text-primary">
            {t('admin.settings.title')}
          </h1>
        </div>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-[13px] font-semibold transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            {t('admin.settings.edit')}
          </button>
        ) : (
          <div className="flex items-center gap-2">
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
        {/* Trading Limits */}
        <div className="bg-bg-secondary rounded-2xl px-5 py-4">
          <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide mb-2">
            {t('admin.settings.tradingLimits')}
          </h2>
          <div className="flex flex-col divide-y divide-border/40">
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
          </div>
        </div>

        {/* Trading Fees */}
        <div className="bg-bg-secondary rounded-2xl px-5 py-4">
          <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide mb-2">
            {t('admin.settings.tradingFees')}
          </h2>
          <div className="flex flex-col divide-y divide-border/40">
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
          </div>
        </div>

        {/* System Status */}
        <div className="bg-bg-secondary rounded-2xl px-5 py-4 lg:col-span-2">
          <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide mb-3">
            {t('admin.settings.systemStatus')}
          </h2>
          <div className="flex flex-col divide-y divide-border/40">
            {/* Trading enabled */}
            <div className="flex items-center justify-between py-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-medium text-text-primary">
                  {t('admin.settings.tradingEnabled')}
                </span>
                <span className="text-[12px] text-text-quaternary">
                  {t('admin.settings.tradingEnabledDesc')}
                </span>
              </div>
              <Toggle
                checked={status.tradingEnabled}
                onChange={(v) => setStatus({ ...status, tradingEnabled: v })}
                disabled={!editMode}
              />
            </div>

            {/* Maintenance mode */}
            <div className="flex items-center justify-between py-3.5">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-text-primary">
                    {t('admin.settings.maintenanceMode')}
                  </span>
                  {status.maintenanceMode && (
                    <AlertTriangle className="w-4 h-4 text-warning" />
                  )}
                </div>
                <span className="text-[12px] text-text-quaternary">
                  {t('admin.settings.maintenanceModeDesc')}
                </span>
              </div>
              <Toggle
                checked={status.maintenanceMode}
                onChange={(v) => setStatus({ ...status, maintenanceMode: v })}
                disabled={!editMode}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
