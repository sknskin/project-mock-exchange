/**
 * @file 관리자 서비스 상태 모니터링 페이지
 * @description 각 마이크로서비스의 헬스 상태를 확인하는 관리자 전용 페이지
 *
 * @file Admin Service Health Monitoring Page
 * @description Admin-only page to check health status of each microservice
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/format';

// ===== Service definitions =====
interface ServiceDef {
  key: string;
  nameKey: string;
  port: number;
  healthPath: string;
}

const SERVICES: ServiceDef[] = [
  { key: 'api-gateway', nameKey: 'admin.health.service.apiGateway', port: 3000, healthPath: '/api/health' },
  { key: 'user-auth', nameKey: 'admin.health.service.userAuth', port: 3007, healthPath: '/api/health' },
  { key: 'market-data', nameKey: 'admin.health.service.marketData', port: 3001, healthPath: '/api/health' },
  { key: 'order-engine', nameKey: 'admin.health.service.orderEngine', port: 3002, healthPath: '/api/health' },
  { key: 'portfolio', nameKey: 'admin.health.service.portfolio', port: 3003, healthPath: '/api/health' },
  { key: 'chat', nameKey: 'admin.health.service.chat', port: 3005, healthPath: '/api/health' },
];

type HealthStatus = 'healthy' | 'unhealthy' | 'checking';

interface ServiceHealth {
  key: string;
  status: HealthStatus;
  responseTime?: number;
  lastChecked?: Date;
}

export default function AdminHealthPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [services, setServices] = useState<ServiceHealth[]>(
    SERVICES.map((s) => ({ key: s.key, status: 'checking' as HealthStatus })),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Non-admin redirect
  useEffect(() => {
    if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const checkHealth = useCallback(async () => {
    setIsRefreshing(true);
    setServices(SERVICES.map((s) => ({ key: s.key, status: 'checking' })));

    const results = await Promise.all(
      SERVICES.map(async (svc) => {
        const start = Date.now();
        try {
          // Use the API gateway proxy - all health endpoints are proxied through /api/health
          // For the gateway itself, just hit /api/health directly
          const url = svc.key === 'api-gateway'
            ? '/api/health'
            : `/api/health/${svc.key}`;
          const res = await fetch(url, {
            signal: AbortSignal.timeout(5000),
          });
          const elapsed = Date.now() - start;
          return {
            key: svc.key,
            status: (res.ok ? 'healthy' : 'unhealthy') as HealthStatus,
            responseTime: elapsed,
            lastChecked: new Date(),
          };
        } catch {
          return {
            key: svc.key,
            status: 'unhealthy' as HealthStatus,
            responseTime: Date.now() - start,
            lastChecked: new Date(),
          };
        }
      }),
    );

    setServices(results);
    setIsRefreshing(false);
  }, []);

  // Check health on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
    return null;
  }

  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const allHealthy = healthyCount === SERVICES.length;
  const checkingCount = services.filter((s) => s.status === 'checking').length;

  const formatTime = (date?: Date) => {
    if (!date) return '-';
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="pb-16">
      {/* Page header */}
      <div className="py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-accent" />
          <div>
            <h1 className="text-[20px] font-extrabold text-text-primary">
              {t('admin.health.title')}
            </h1>
            <p className="text-[13px] text-text-tertiary mt-0.5">
              {t('admin.health.subtitle')}
            </p>
          </div>
        </div>
        <button
          onClick={checkHealth}
          disabled={isRefreshing}
          className={cn(
            'flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-semibold transition-colors border',
            isRefreshing
              ? 'border-border text-text-quaternary cursor-not-allowed'
              : 'border-accent/30 text-accent hover:bg-accent/10',
          )}
        >
          <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          {isRefreshing ? t('admin.health.refreshing') : t('admin.health.refresh')}
        </button>
      </div>

      {/* Overall status banner */}
      {checkingCount === 0 && (
        <div
          className={cn(
            'flex items-center gap-3 mb-6 px-4 py-3 rounded-xl border',
            allHealthy
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : 'bg-red-500/5 border-red-500/20',
          )}
        >
          {allHealthy ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span
            className={cn(
              'text-[14px] font-semibold',
              allHealthy ? 'text-emerald-400' : 'text-red-400',
            )}
          >
            {allHealthy ? t('admin.health.allHealthy') : t('admin.health.someDown')}
          </span>
          <span className="text-[13px] text-text-quaternary ml-auto">
            {healthyCount}/{SERVICES.length}
          </span>
        </div>
      )}

      {/* Service cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SERVICES.map((svc) => {
          const health = services.find((s) => s.key === svc.key);
          const status = health?.status ?? 'checking';
          return (
            <div
              key={svc.key}
              className={cn(
                'bg-bg-secondary rounded-2xl px-5 py-4 border transition-colors',
                status === 'healthy'
                  ? 'border-emerald-500/20'
                  : status === 'unhealthy'
                    ? 'border-red-500/20'
                    : 'border-border',
              )}
            >
              {/* Service name + status indicator */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-bold text-text-primary">
                  {t(svc.nameKey as Parameters<typeof t>[0])}
                </h3>
                {status === 'checking' ? (
                  <Loader2 className="w-5 h-5 text-text-quaternary animate-spin" />
                ) : status === 'healthy' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[12px] font-semibold text-emerald-400">
                      {t('admin.health.healthy')}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="text-[12px] font-semibold text-red-400">
                      {t('admin.health.unhealthy')}
                    </span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-text-quaternary">{t('admin.health.port')}</span>
                  <span className="text-[12px] text-text-tertiary font-mono">{svc.port}</span>
                </div>
                {health?.responseTime !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-text-quaternary">{t('admin.health.responseTime')}</span>
                    <span
                      className={cn(
                        'text-[12px] font-mono',
                        (health.responseTime ?? 0) < 200
                          ? 'text-emerald-400'
                          : (health.responseTime ?? 0) < 1000
                            ? 'text-yellow-400'
                            : 'text-red-400',
                      )}
                    >
                      {health.responseTime}ms
                    </span>
                  </div>
                )}
                {health?.lastChecked && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-text-quaternary">{t('admin.health.lastChecked')}</span>
                    <span className="text-[12px] text-text-tertiary tabular-nums">
                      {formatTime(health.lastChecked)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
