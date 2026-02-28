/**
 * @file 관리자 서비스 상태 모니터링 페이지
 * @description 개요 탭 + 개별 서비스 상세 탭으로 마이크로서비스 헬스를 모니터링합니다
 *
 * @file Admin Service Health Monitoring Page
 * @description Overview tab + individual service detail tabs for microservice health monitoring
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, RefreshCw, CheckCircle2, XCircle, Loader2,
  Server, Database, Cpu, Clock, Globe, Zap,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import type { TranslationKey } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/format';

// ===== Service definitions (포트 정보는 API에서 동적으로 가져옴) =====
// Service definitions (port info fetched dynamically from API)
interface ServiceDef {
  key: string;
  nameKey: string;
  descKey: string;
  port: number;
  hasStats: boolean;
}

const SERVICE_META: Omit<ServiceDef, 'port'>[] = [
  { key: 'api-gateway', nameKey: 'admin.health.service.apiGateway', descKey: 'admin.health.desc.apiGateway', hasStats: false },
  { key: 'user-auth', nameKey: 'admin.health.service.userAuth', descKey: 'admin.health.desc.userAuth', hasStats: true },
  { key: 'market-data', nameKey: 'admin.health.service.marketData', descKey: 'admin.health.desc.marketData', hasStats: true },
  { key: 'order-engine', nameKey: 'admin.health.service.orderEngine', descKey: 'admin.health.desc.orderEngine', hasStats: false },
  { key: 'portfolio', nameKey: 'admin.health.service.portfolio', descKey: 'admin.health.desc.portfolio', hasStats: false },
  { key: 'chat', nameKey: 'admin.health.service.chat', descKey: 'admin.health.desc.chat', hasStats: true },
  { key: 'ai-service', nameKey: 'admin.health.service.aiService', descKey: 'admin.health.desc.aiService', hasStats: false },
  { key: 'notification', nameKey: 'admin.health.service.notification', descKey: 'admin.health.desc.notification', hasStats: false },
];

// 포트 정보 fallback (API 호출 전 초기값)
// Port info fallback (initial values before API call)
const DEFAULT_PORTS: Record<string, number> = {
  'api-gateway': 3000, 'user-auth': 3007, 'market-data': 3001,
  'order-engine': 3002, 'portfolio': 3003, 'chat': 3005,
  'ai-service': 3006, 'notification': 3004,
};

type HealthStatus = 'healthy' | 'unhealthy' | 'checking';

interface ServiceHealth {
  key: string;
  status: HealthStatus;
  responseTime?: number;
  lastChecked?: Date;
}

interface ProbeResult {
  status: 'up' | 'down';
  responseTime: number;
  data?: Record<string, unknown>;
}

interface ServiceDetail {
  probes: { live: ProbeResult; ready: ProbeResult; startup: ProbeResult };
  stats: Record<string, unknown> | null;
  checkedAt: string;
}

export default function AdminHealthPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [portMap, setPortMap] = useState<Record<string, number>>(DEFAULT_PORTS);
  const [services, setServices] = useState<ServiceHealth[]>(
    SERVICE_META.map((s) => ({ key: s.key, status: 'checking' as HealthStatus })),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [serviceDetail, setServiceDetail] = useState<ServiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 포트 정보 API에서 가져오기 (Fetch port info from API)
  useEffect(() => {
    fetch('/api/health/services', { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then((data) => {
        if (data?.services) {
          const map: Record<string, number> = {};
          for (const s of data.services) map[s.key] = s.port;
          setPortMap(map);
        }
      })
      .catch(() => { /* fallback to DEFAULT_PORTS */ });
  }, []);

  const SERVICES: ServiceDef[] = SERVICE_META.map((m) => ({ ...m, port: portMap[m.key] ?? 0 }));

  useEffect(() => {
    if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // === 개요 헬스 체크 (Overview health check) ===
  const checkHealth = useCallback(async () => {
    setIsRefreshing(true);
    setServices(SERVICE_META.map((s) => ({ key: s.key, status: 'checking' })));

    const results = await Promise.all(
      SERVICE_META.map(async (svc) => {
        const start = Date.now();
        try {
          const url = svc.key === 'api-gateway' ? '/api/health' : `/api/health/${svc.key}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
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

  // === 개별 서비스 상세 로드 (Load individual service detail) ===
  const loadServiceDetail = useCallback(async (serviceKey: string) => {
    if (serviceKey === 'overview' || serviceKey === 'api-gateway') {
      setServiceDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/health/${serviceKey}/detail`, {
        signal: AbortSignal.timeout(10000),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setServiceDetail(data);
      } else {
        setServiceDetail(null);
      }
    } catch {
      setServiceDetail(null);
    }
    setDetailLoading(false);
  }, [token]);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  useEffect(() => {
    if (activeTab !== 'overview') {
      loadServiceDetail(activeTab);
    }
  }, [activeTab, loadServiceDetail]);

  if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') return null;

  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const allHealthy = healthyCount === SERVICES.length;
  const checkingCount = services.filter((s) => s.status === 'checking').length;

  const formatTime = (date?: Date) => {
    if (!date) return '-';
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const activeService = SERVICES.find((s) => s.key === activeTab);
  const activeHealth = services.find((s) => s.key === activeTab);

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
          onClick={() => {
            checkHealth();
            if (activeTab !== 'overview') loadServiceDetail(activeTab);
          }}
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

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'shrink-0 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors',
            activeTab === 'overview'
              ? 'bg-accent text-white'
              : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary',
          )}
        >
          {t('admin.health.tab.overview')}
        </button>
        {SERVICES.map((svc) => {
          const health = services.find((s) => s.key === svc.key);
          const statusColor = health?.status === 'healthy' ? 'bg-emerald-400'
            : health?.status === 'unhealthy' ? 'bg-red-400'
            : 'bg-text-quaternary';
          return (
            <button
              key={svc.key}
              onClick={() => setActiveTab(svc.key)}
              className={cn(
                'shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                activeTab === svc.key
                  ? 'bg-accent text-white'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary',
              )}
            >
              <span className={cn('w-2 h-2 rounded-full shrink-0', statusColor, activeTab === svc.key && 'bg-white/80')} />
              {t(svc.nameKey as Parameters<typeof t>[0])}
            </button>
          );
        })}
      </div>

      {/* ==================== 개요 탭 (Overview Tab) ==================== */}
      {activeTab === 'overview' && (
        <>
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
              <span className={cn('text-[14px] font-semibold', allHealthy ? 'text-emerald-400' : 'text-red-400')}>
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
                <button
                  key={svc.key}
                  onClick={() => setActiveTab(svc.key)}
                  className={cn(
                    'text-left bg-bg-secondary rounded-2xl px-5 py-4 border transition-all hover:shadow-lg hover:scale-[1.01]',
                    status === 'healthy'
                      ? 'border-emerald-500/20 hover:border-emerald-500/40'
                      : status === 'unhealthy'
                        ? 'border-red-500/20 hover:border-red-500/40'
                        : 'border-border',
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[15px] font-bold text-text-primary">
                      {t(svc.nameKey as Parameters<typeof t>[0])}
                    </h3>
                    {status === 'checking' ? (
                      <Loader2 className="w-5 h-5 text-text-quaternary animate-spin" />
                    ) : status === 'healthy' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[12px] font-semibold text-emerald-400">{t('admin.health.healthy')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <span className="text-[12px] font-semibold text-red-400">{t('admin.health.unhealthy')}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[12px] text-text-quaternary mb-3">
                    {t(svc.descKey as Parameters<typeof t>[0])}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-text-quaternary">{t('admin.health.port')}</span>
                      <span className="text-[12px] text-text-tertiary font-mono">{svc.port}</span>
                    </div>
                    {health?.responseTime !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-text-quaternary">{t('admin.health.responseTime')}</span>
                        <span className={cn(
                          'text-[12px] font-mono',
                          (health.responseTime ?? 0) < 200 ? 'text-emerald-400'
                            : (health.responseTime ?? 0) < 1000 ? 'text-yellow-400' : 'text-red-400',
                        )}>
                          {health.responseTime}ms
                        </span>
                      </div>
                    )}
                    {health?.lastChecked && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-text-quaternary">{t('admin.health.lastChecked')}</span>
                        <span className="text-[12px] text-text-tertiary tabular-nums">{formatTime(health.lastChecked)}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ==================== 상세 탭 (Detail Tab) ==================== */}
      {activeTab !== 'overview' && activeService && (
        <div className="space-y-6">
          {/* Service header */}
          <div className={cn(
            'flex items-center gap-4 px-5 py-4 rounded-2xl border',
            activeHealth?.status === 'healthy' ? 'bg-emerald-500/5 border-emerald-500/20'
              : activeHealth?.status === 'unhealthy' ? 'bg-red-500/5 border-red-500/20'
              : 'bg-bg-secondary border-border',
          )}>
            <Server className={cn(
              'w-8 h-8',
              activeHealth?.status === 'healthy' ? 'text-emerald-400'
                : activeHealth?.status === 'unhealthy' ? 'text-red-400' : 'text-text-quaternary',
            )} />
            <div className="flex-1">
              <h2 className="text-[18px] font-bold text-text-primary">
                {t(activeService.nameKey as Parameters<typeof t>[0])}
              </h2>
              <p className="text-[13px] text-text-tertiary">
                {t(activeService.descKey as Parameters<typeof t>[0])}
              </p>
            </div>
            <div className="text-right">
              {activeHealth?.status === 'healthy' ? (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[14px] font-bold text-emerald-400">{t('admin.health.healthy')}</span>
                </div>
              ) : activeHealth?.status === 'unhealthy' ? (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="text-[14px] font-bold text-red-400">{t('admin.health.unhealthy')}</span>
                </div>
              ) : (
                <Loader2 className="w-5 h-5 text-text-quaternary animate-spin" />
              )}
              {activeHealth?.responseTime !== undefined && (
                <span className="text-[12px] text-text-quaternary mt-1 block">{activeHealth.responseTime}ms</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Info Card */}
            <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-accent" />
                <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.serviceInfo')}</h3>
              </div>
              <div className="space-y-3">
                <InfoRow label={t('admin.health.port')} value={`${activeService.port}`} mono />
                <InfoRow label={t('admin.health.endpoint')} value={`http://localhost:${activeService.port}`} mono />
                <InfoRow label={t('admin.health.description')} value={t(activeService.descKey as Parameters<typeof t>[0])} />
                {activeHealth?.lastChecked && (
                  <InfoRow label={t('admin.health.lastChecked')} value={formatTime(activeHealth.lastChecked)} />
                )}
              </div>
            </div>

            {/* Health Probes Card */}
            <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-accent" />
                <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.probes')}</h3>
              </div>
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-text-quaternary animate-spin" />
                  <span className="ml-2 text-[13px] text-text-quaternary">{t('admin.health.loading')}</span>
                </div>
              ) : activeTab === 'api-gateway' ? (
                <div className="space-y-3">
                  <ProbeRow label={t('admin.health.probe.live')} status={activeHealth?.status === 'healthy' ? 'up' : 'down'} responseTime={activeHealth?.responseTime} />
                  <ProbeRow label={t('admin.health.probe.ready')} status={activeHealth?.status === 'healthy' ? 'up' : 'down'} responseTime={activeHealth?.responseTime} />
                  <ProbeRow label={t('admin.health.probe.startup')} status={activeHealth?.status === 'healthy' ? 'up' : 'down'} responseTime={activeHealth?.responseTime} />
                </div>
              ) : serviceDetail?.probes ? (
                <div className="space-y-3">
                  <ProbeRow label={t('admin.health.probe.live')} status={serviceDetail.probes.live.status} responseTime={serviceDetail.probes.live.responseTime} data={serviceDetail.probes.live.data} />
                  <ProbeRow label={t('admin.health.probe.ready')} status={serviceDetail.probes.ready.status} responseTime={serviceDetail.probes.ready.responseTime} data={serviceDetail.probes.ready.data} />
                  <ProbeRow label={t('admin.health.probe.startup')} status={serviceDetail.probes.startup.status} responseTime={serviceDetail.probes.startup.responseTime} data={serviceDetail.probes.startup.data} />
                </div>
              ) : (
                <p className="text-[13px] text-text-quaternary py-4">{t('admin.health.noMetrics')}</p>
              )}
            </div>
          </div>

          {/* Service Metrics Card */}
          <ServiceMetricsCard
            serviceKey={activeTab}
            stats={serviceDetail?.stats}
            loading={detailLoading}
            t={t}
          />
        </div>
      )}
    </div>
  );
}

// ===== Sub-components =====

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-text-quaternary shrink-0">{label}</span>
      <span className={cn('text-[12px] text-text-tertiary text-right truncate', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

function ProbeRow({ label, status, responseTime, data }: {
  label: string;
  status: 'up' | 'down';
  responseTime?: number;
  data?: Record<string, unknown>;
}) {
  const hasDbInfo = data && typeof data === 'object' && 'info' in data;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-primary/50">
      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', status === 'up' ? 'bg-emerald-400' : 'bg-red-400')} />
      <span className="text-[13px] font-medium text-text-primary flex-1">{label}</span>
      {hasDbInfo && (
        <span className="text-[11px] text-text-quaternary flex items-center gap-1">
          <Database className="w-3 h-3" /> DB
        </span>
      )}
      <span className={cn(
        'text-[12px] font-semibold',
        status === 'up' ? 'text-emerald-400' : 'text-red-400',
      )}>
        {status === 'up' ? 'OK' : 'DOWN'}
      </span>
      {responseTime !== undefined && (
        <span className={cn(
          'text-[11px] font-mono tabular-nums min-w-[48px] text-right',
          responseTime < 100 ? 'text-emerald-400' : responseTime < 500 ? 'text-yellow-400' : 'text-red-400',
        )}>
          {responseTime}ms
        </span>
      )}
    </div>
  );
}

function ServiceMetricsCard({ serviceKey, stats, loading, t }: {
  serviceKey: string;
  stats: Record<string, unknown> | null | undefined;
  loading: boolean;
  t: (key: TranslationKey) => string;
}) {
  if (loading) {
    return (
      <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-4 h-4 text-accent" />
          <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.serviceMetrics')}</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-text-quaternary animate-spin" />
          <span className="ml-2 text-[13px] text-text-quaternary">{t('admin.health.loading')}</span>
        </div>
      </div>
    );
  }

  // API 응답에서 실제 데이터 추출 (Unwrap { success, data } wrapper)
  const unwrap = (raw: Record<string, unknown>): unknown => {
    if (raw && typeof raw === 'object' && 'data' in raw) return raw.data;
    return raw;
  };

  // user-auth 통계 (User-auth statistics)
  if (serviceKey === 'user-auth' && stats) {
    const s = (unwrap(stats) ?? stats) as Record<string, number>;
    const metrics = [
      { label: t('admin.health.totalUsers'), value: s.totalUsers ?? 0, icon: '👥' },
      { label: t('admin.health.activeUsers'), value: s.activeUsers ?? 0, icon: '✅' },
      { label: t('admin.health.pendingUsers'), value: s.pendingUsers ?? 0, icon: '⏳' },
      { label: t('admin.health.todayLogins'), value: s.todayLogins ?? 0, icon: '🔑' },
      { label: t('admin.health.totalPageViews'), value: s.totalPageViews ?? 0, icon: '👁' },
      { label: t('admin.health.totalAnnouncements'), value: s.totalAnnouncements ?? 0, icon: '📢' },
    ];
    return <MetricsGrid title={t('admin.health.serviceMetrics')} metrics={metrics} />;
  }

  // chat 통계 (Chat statistics)
  if (serviceKey === 'chat' && stats) {
    const s = (unwrap(stats) ?? stats) as Record<string, number>;
    const metrics = [
      { label: t('admin.health.totalRooms'), value: s.totalRooms ?? 0, icon: '💬' },
      { label: t('admin.health.dmCount'), value: s.dmCount ?? 0, icon: '✉️' },
      { label: t('admin.health.groupCount'), value: s.groupCount ?? 0, icon: '👥' },
      { label: t('admin.health.totalMessages'), value: s.totalMessages ?? 0, icon: '📨' },
      { label: t('admin.health.todayMessages'), value: s.todayMessages ?? 0, icon: '📩' },
      { label: t('admin.health.activeParticipants'), value: s.activeParticipants ?? 0, icon: '🟢' },
    ];
    return <MetricsGrid title={t('admin.health.serviceMetrics')} metrics={metrics} />;
  }

  // market-data 통계 (Market data statistics)
  if (serviceKey === 'market-data' && stats) {
    const raw = unwrap(stats);
    const assets = Array.isArray(raw) ? raw : [];
    const cryptoCount = assets.filter((a: Record<string, string>) => a.assetType === 'CRYPTO').length;
    const stockKRCount = assets.filter((a: Record<string, string>) => a.assetType === 'STOCK_KR' || a.assetType?.includes('KR')).length;
    const stockUSCount = assets.filter((a: Record<string, string>) => a.assetType === 'STOCK_US' || a.assetType === 'STOCK').length;
    const metrics = [
      { label: t('admin.health.totalAssets'), value: assets.length, icon: '📊' },
      { label: 'Crypto', value: cryptoCount, icon: '₿' },
      { label: 'KR Stocks', value: stockKRCount, icon: '🇰🇷' },
      { label: 'US Stocks', value: stockUSCount, icon: '🇺🇸' },
    ];
    return <MetricsGrid title={t('admin.health.serviceMetrics')} metrics={metrics} />;
  }

  // 통계 없는 서비스 (Services without stats)
  return (
    <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="w-4 h-4 text-accent" />
        <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.serviceMetrics')}</h3>
      </div>
      <div className="flex items-center justify-center py-8">
        <Clock className="w-5 h-5 text-text-quaternary mr-2" />
        <span className="text-[13px] text-text-quaternary">{t('admin.health.noMetrics')}</span>
      </div>
    </div>
  );
}

function MetricsGrid({ title, metrics }: {
  title: string;
  metrics: { label: string; value: number; icon: string }[];
}) {
  return (
    <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="w-4 h-4 text-accent" />
        <h3 className="text-[14px] font-bold text-text-primary">{title}</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-bg-primary/50 rounded-xl px-4 py-3 text-center">
            <div className="text-[20px] mb-1">{m.icon}</div>
            <div className="text-[20px] font-bold text-text-primary tabular-nums">
              {m.value.toLocaleString()}
            </div>
            <div className="text-[11px] text-text-quaternary mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
