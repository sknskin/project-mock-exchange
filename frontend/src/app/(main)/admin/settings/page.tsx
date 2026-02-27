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
import { Settings, AlertTriangle, Info } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { useAdminSettingsStore } from '@/stores/adminSettings';
import { useToastStore } from '@/stores/toast';
import { cn } from '@/lib/format';

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
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  suffix?: string;
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
          className="w-full max-w-[200px] bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-[14px] text-text-primary font-mono focus:outline-none focus:border-accent/60 transition-colors"
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

  const {
    tradingLimits,
    tradingFees,
    systemStatus,
    setTradingLimits,
    setTradingFees,
    setSystemStatus,
  } = useAdminSettingsStore();

  // Local form state
  const [limits, setLimits] = useState(tradingLimits);
  const [fees, setFees] = useState(tradingFees);
  const [status, setStatus] = useState(systemStatus);

  // Sync from store on mount
  useEffect(() => {
    setLimits(tradingLimits);
    setFees(tradingFees);
    setStatus(systemStatus);
  }, [tradingLimits, tradingFees, systemStatus]);

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
    setTradingLimits(limits);
    setTradingFees(fees);
    setSystemStatus(status);
    useToastStore.getState().addToast(t('admin.settings.saved'), 'success');
  };

  return (
    <div className="pb-16">
      {/* Page header */}
      <div className="py-6 flex items-center gap-2.5">
        <Settings className="w-5 h-5 text-accent" />
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('admin.settings.title')}
        </h1>
      </div>

      {/* Local-only notice */}
      <div className="flex items-start gap-2.5 mb-6 px-4 py-3 rounded-xl bg-accent/5 border border-accent/20">
        <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <span className="text-[13px] text-text-secondary">
          {t('admin.settings.localOnly')}
        </span>
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
            />
            <NumberField
              label={t('admin.settings.maxOrderQty')}
              value={limits.maxOrderQty}
              onChange={(v) => setLimits({ ...limits, maxOrderQty: v })}
              step={1}
              min={1}
            />
            <NumberField
              label={t('admin.settings.maxOpenOrders')}
              value={limits.maxOpenOrdersPerUser}
              onChange={(v) => setLimits({ ...limits, maxOpenOrdersPerUser: v })}
              step={1}
              min={1}
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
            />
            <NumberField
              label={t('admin.settings.takerFee')}
              value={fees.takerFee}
              onChange={(v) => setFees({ ...fees, takerFee: v })}
              step={0.01}
              min={0}
              suffix="%"
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
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          className="h-11 px-8 rounded-xl bg-accent hover:bg-accent/90 text-white text-[14px] font-semibold transition-colors"
        >
          {t('admin.settings.save')}
        </button>
      </div>
    </div>
  );
}
