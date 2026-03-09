/**
 * @file 관리자 서비스 상태 모니터링 페이지
 * @description 개요 탭 + 개별 서비스 상세 탭으로 마이크로서비스 헬스를 모니터링합니다
 *
 * @file Admin Service Health Monitoring Page
 * @description Overview tab + individual service detail tabs for microservice health monitoring
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, RefreshCw, CheckCircle2, XCircle, Loader2,
  Server, Database, Clock, Globe, Zap, Code, Link2, Layers, Info,
  BarChart3, Shield,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/format';

// ===== 서브 컴포넌트 임포트 — 코드 분할을 위해 별도 파일로 추출 / Sub-component import — extracted to separate file for code-splitting =====
import {
  InfoRow,
  ProbeRow,
  SummaryCell,
  ArchitectureDiagram,
  ResponseTimeHistoryCard,
  EnvironmentInfoCard,
  DatabaseInfoCard,
  LogLevelBadge,
  ServiceCommunicationMap,
  QuickActionsCard,
  ServiceMetricsCard,
} from '@/components/admin/health/HealthSubComponents';

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
  { key: 'market-data', nameKey: 'admin.health.service.marketData', descKey: 'admin.health.desc.marketData', hasStats: true },
  { key: 'order-engine', nameKey: 'admin.health.service.orderEngine', descKey: 'admin.health.desc.orderEngine', hasStats: false },
  { key: 'portfolio', nameKey: 'admin.health.service.portfolio', descKey: 'admin.health.desc.portfolio', hasStats: false },
  { key: 'notification', nameKey: 'admin.health.service.notification', descKey: 'admin.health.desc.notification', hasStats: false },
  { key: 'chat', nameKey: 'admin.health.service.chat', descKey: 'admin.health.desc.chat', hasStats: true },
  { key: 'ai-service', nameKey: 'admin.health.service.aiService', descKey: 'admin.health.desc.aiService', hasStats: false },
  { key: 'user-auth', nameKey: 'admin.health.service.userAuth', descKey: 'admin.health.desc.userAuth', hasStats: true },
];

// 포트 정보 fallback (API 호출 전 초기값)
// Port info fallback (initial values before API call)
const DEFAULT_PORTS: Record<string, number> = {
  'api-gateway': 3000, 'user-auth': 3007, 'market-data': 3001,
  'order-engine': 3002, 'portfolio': 3003, 'chat': 3005,
  'ai-service': 3006, 'notification': 3004,
};

// 서비스별 상세 메타 (기술 스택, 의존 서비스, 주요 엔드포인트)
// Per-service detailed meta (tech stack, dependencies, key endpoints)
interface ServiceMeta {
  tech: string[];
  db?: string;
  deps: string[];
  endpoints: string[];
  protocol: string;
  detailKey: string;
}

const SERVICE_DETAIL_META: Record<string, ServiceMeta> = {
  'api-gateway': {
    tech: ['NestJS', 'Socket.io', 'Passport JWT', 'HttpProxy'],
    deps: ['user-auth', 'market-data', 'order-engine', 'portfolio', 'notification', 'chat', 'ai-service'],
    endpoints: ['/api/health', '/api/auth/*', '/api/orders/*', '/api/portfolio/*', '/api/chat/*'],
    protocol: 'HTTP + WebSocket',
    detailKey: 'admin.health.detail.apiGateway',
  },
  'user-auth': {
    tech: ['NestJS', 'Prisma', 'JWT', 'bcrypt', 'TOTP'],
    db: 'mex_auth',
    deps: ['PostgreSQL', 'Redis'],
    endpoints: ['/auth/login', '/auth/register', '/auth/refresh', '/admin/users', '/admin/settings'],
    protocol: 'HTTP',
    detailKey: 'admin.health.detail.userAuth',
  },
  'market-data': {
    tech: ['NestJS', 'Prisma', 'Binance WS', 'Kafka Producer'],
    db: 'mex_market',
    deps: ['PostgreSQL', 'Kafka', 'Binance API'],
    endpoints: ['/assets', '/assets/:symbol/candles', '/assets/:symbol/price', '/news'],
    protocol: 'HTTP + Kafka',
    detailKey: 'admin.health.detail.marketData',
  },
  'order-engine': {
    tech: ['NestJS', 'Prisma', 'Kafka', 'Event Sourcing', 'CQRS'],
    db: 'mex_orders',
    deps: ['PostgreSQL', 'Kafka', 'market-data', 'portfolio'],
    endpoints: ['/orders', '/orders/:id', '/orders/cancel/:id', '/stats/trading'],
    protocol: 'HTTP + Kafka',
    detailKey: 'admin.health.detail.orderEngine',
  },
  'portfolio': {
    tech: ['NestJS', 'Prisma'],
    db: 'mex_portfolio',
    deps: ['PostgreSQL'],
    endpoints: ['/portfolio', '/portfolio/holdings', '/portfolio/transactions', '/portfolio/balance'],
    protocol: 'HTTP',
    detailKey: 'admin.health.detail.portfolio',
  },
  'notification': {
    tech: ['NestJS', 'Nodemailer', 'Kafka Consumer'],
    deps: ['Kafka', 'SMTP'],
    endpoints: ['/notifications', '/notifications/settings'],
    protocol: 'HTTP + Kafka',
    detailKey: 'admin.health.detail.notification',
  },
  'chat': {
    tech: ['NestJS', 'Prisma', 'Socket.io'],
    db: 'mex_chat',
    deps: ['PostgreSQL'],
    endpoints: ['/rooms', '/rooms/:id/messages', '/rooms/:id/participants'],
    protocol: 'HTTP + WebSocket',
    detailKey: 'admin.health.detail.chat',
  },
  'ai-service': {
    tech: ['NestJS', 'Anthropic Claude API'],
    deps: ['Claude API'],
    endpoints: ['/analysis/:symbol', '/analysis/portfolio', '/analysis/market'],
    protocol: 'HTTP',
    detailKey: 'admin.health.detail.aiService',
  },
};

// 서비스별 로그 레벨 (Log level per service - placeholder/static)
const SERVICE_LOG_LEVELS: Record<string, 'debug' | 'info' | 'warn'> = {
  'api-gateway': 'info',
  'user-auth': 'info',
  'market-data': 'debug',
  'order-engine': 'info',
  'portfolio': 'info',
  'notification': 'warn',
  'chat': 'debug',
  'ai-service': 'info',
};

// 서비스별 DB 스키마 정보 (DB schema info per service)
const _SERVICE_DB_SCHEMAS: Record<string, string[]> = {
  'user-auth': ['User', 'Session', 'PageView', 'Announcement', 'SystemSetting'],
  'market-data': ['Asset', 'Candle', 'News', 'PriceHistory'],
  'order-engine': ['Order', 'OrderEvent', 'TradeExecution'],
  'portfolio': ['Portfolio', 'Holding', 'Transaction', 'Balance'],
  'chat': ['Room', 'Message', 'Participant', 'ReadReceipt'],
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

// 응답 시간 이력 최대 횟수 (Max response time history entries)
const MAX_HISTORY = 5;
/** 관리자 서비스 헬스 모니터링 페이지 컴포넌트 — 개요 + 개별 서비스 상세 탭
 * Admin service health monitoring page component — overview + individual service detail tabs */
export default function AdminHealthPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  const [activeTab, setActiveTabRaw] = useState<string>('overview');
  /** 탭 전환 시 상단으로 스크롤
   * Switch tab and scroll to top */
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabRaw(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const [portMap, setPortMap] = useState<Record<string, number>>(DEFAULT_PORTS);
  const [services, setServices] = useState<ServiceHealth[]>(
    SERVICE_META.map((s) => ({ key: s.key, status: 'checking' as HealthStatus })),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [serviceDetail, setServiceDetail] = useState<ServiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 응답 시간 이력 (Response time history) - keyed by service key
  const [responseHistory, setResponseHistory] = useState<Record<string, number[]>>({});
  const checkCountRef = useRef(0);

  // 포트 정보 API에서 가져오기 (Fetch port info from API)
  useEffect(() => {
    // eslint-disable-next-line no-undef
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
          // eslint-disable-next-line no-undef
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

    // 응답 시간 이력 업데이트 (Update response time history)
    checkCountRef.current += 1;
    setResponseHistory((prev) => {
      const next = { ...prev };
      for (const r of results) {
        if (r.responseTime !== undefined) {
          const existing = next[r.key] ?? [];
          next[r.key] = [...existing, r.responseTime].slice(-MAX_HISTORY);
        }
      }
      return next;
    });

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
        signal: AbortSignal.timeout(10000), // eslint-disable-line no-undef
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

  // 시스템 리소스 요약 계산 (Calculate system resource summary)
  const totalResponseTime = services.reduce((sum, s) => sum + (s.responseTime ?? 0), 0);
  const validResponseServices = services.filter((s) => s.responseTime !== undefined);
  const avgResponseTime = validResponseServices.length > 0
    ? Math.round(totalResponseTime / validResponseServices.length)
    : 0;
  const uptimePercent = SERVICES.length > 0
    ? Math.round((healthyCount / SERVICES.length) * 100)
    : 0;
  const dbCount = Object.values(SERVICE_DETAIL_META).filter((m) => m.db).length;
  const totalEndpoints = Object.values(SERVICE_DETAIL_META).reduce((sum, m) => sum + m.endpoints.length, 0);

  /** Date 객체를 HH:MM:SS 형식으로 포맷
   * Format Date object as HH:MM:SS */
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
        <div className="flex flex-col items-end gap-1">
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
          {services.some((s) => s.lastChecked) && (
            <span className="text-[11px] text-text-quaternary tabular-nums pr-1">
              {formatTime(services.find((s) => s.lastChecked)?.lastChecked)}
            </span>
          )}
        </div>
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

          {/* [NEW] System Resource Summary */}
          {checkingCount === 0 && (
            <div className="bg-bg-secondary rounded-2xl p-5 border border-border mb-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-accent" />
                <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.systemSummary')}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <SummaryCell
                  label={t('admin.health.serviceCount')}
                  value={`${SERVICES.length}`}
                  sub={`${healthyCount} OK`}
                  icon={<Server className="w-4 h-4" />}
                  color="text-accent"
                />
                <SummaryCell
                  label={t('admin.health.uptimePercent')}
                  value={`${uptimePercent}%`}
                  sub={uptimePercent === 100 ? 'ALL UP' : `${SERVICES.length - healthyCount} DOWN`}
                  icon={<Shield className="w-4 h-4" />}
                  color={uptimePercent === 100 ? 'text-emerald-400' : uptimePercent >= 50 ? 'text-yellow-400' : 'text-red-400'}
                />
                <SummaryCell
                  label={t('admin.health.totalResponseTime')}
                  value={`${totalResponseTime}ms`}
                  sub={`${SERVICES.length} svc`}
                  icon={<Zap className="w-4 h-4" />}
                  color="text-text-secondary"
                />
                <SummaryCell
                  label={t('admin.health.avgResponseTime')}
                  value={`${avgResponseTime}ms`}
                  sub={avgResponseTime < 200 ? 'FAST' : avgResponseTime < 1000 ? 'OK' : 'SLOW'}
                  icon={<Clock className="w-4 h-4" />}
                  color={avgResponseTime < 200 ? 'text-emerald-400' : avgResponseTime < 1000 ? 'text-yellow-400' : 'text-red-400'}
                />
                <SummaryCell
                  label={t('admin.health.dbCount')}
                  value={`${dbCount}`}
                  sub="PostgreSQL"
                  icon={<Database className="w-4 h-4" />}
                  color="text-blue-400"
                />
                <SummaryCell
                  label={t('admin.health.totalEndpoints')}
                  value={`${totalEndpoints}`}
                  sub={`${Object.keys(SERVICE_DETAIL_META).length} svc`}
                  icon={<Globe className="w-4 h-4" />}
                  color="text-purple-400"
                />
              </div>
            </div>
          )}

          {/* [NEW] Architecture Diagram */}
          <ArchitectureDiagram services={services} t={t} />

          {/* Service cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
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
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-bold text-text-primary">
                  {t(activeService.nameKey as Parameters<typeof t>[0])}
                </h2>
                {/* [NEW] Log Level Badge */}
                <LogLevelBadge level={SERVICE_LOG_LEVELS[activeTab] ?? 'info'} t={t} />
              </div>
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

          {/* Detailed description */}
          {(() => {
            const meta = SERVICE_DETAIL_META[activeTab];
            if (!meta) return null;
            return (
              <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-accent" />
                  <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.description')}</h3>
                </div>
                <p className="text-[13px] text-text-tertiary leading-relaxed">
                  {t(meta.detailKey as Parameters<typeof t>[0])}
                </p>
              </div>
            );
          })()}

          {/* [NEW] Quick Actions */}
          <QuickActionsCard serviceKey={activeTab} t={t} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Info Card */}
            <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-accent" />
                <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.serviceInfo')}</h3>
              </div>
              <div className="space-y-3">
                <InfoRow label={t('admin.health.port')} value={`${activeService.port}`} mono />
                <InfoRow label={t('admin.health.endpoint')} value={`${activeService.key}:${activeService.port}`} mono />
                <InfoRow label={t('admin.health.protocol')} value={SERVICE_DETAIL_META[activeTab]?.protocol ?? 'HTTP'} />
                {SERVICE_DETAIL_META[activeTab]?.db && (
                  <InfoRow label={t('admin.health.database')} value={SERVICE_DETAIL_META[activeTab].db!} mono />
                )}
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

            {/* Tech Stack Card */}
            {SERVICE_DETAIL_META[activeTab] && (
              <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Code className="w-4 h-4 text-accent" />
                  <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.techStack')}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_DETAIL_META[activeTab].tech.map((tech) => (
                    <span key={tech} className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-[12px] font-semibold">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dependencies Card */}
            {SERVICE_DETAIL_META[activeTab] && (
              <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Link2 className="w-4 h-4 text-accent" />
                  <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.dependencies')}</h3>
                </div>
                <div className="space-y-2">
                  {SERVICE_DETAIL_META[activeTab].deps.map((dep) => {
                    const depHealth = services.find((s) => s.key === dep);
                    return (
                      <div key={dep} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-primary/50">
                        {depHealth ? (
                          <span className={cn('w-2 h-2 rounded-full shrink-0', depHealth.status === 'healthy' ? 'bg-emerald-400' : depHealth.status === 'unhealthy' ? 'bg-red-400' : 'bg-text-quaternary')} />
                        ) : (
                          <Layers className="w-3 h-3 text-text-quaternary shrink-0" />
                        )}
                        <span className="text-[13px] text-text-primary">{dep}</span>
                        {depHealth && (
                          <span className={cn('text-[11px] ml-auto', depHealth.status === 'healthy' ? 'text-emerald-400' : 'text-red-400')}>
                            {depHealth.status === 'healthy' ? 'OK' : 'DOWN'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* [NEW] Environment Info Card */}
            <EnvironmentInfoCard serviceKey={activeTab} t={t} />

            {/* [NEW] Database Info Card */}
            <DatabaseInfoCard serviceKey={activeTab} serviceHealth={activeHealth} t={t} />
          </div>

          {/* [NEW] Response Time History */}
          <ResponseTimeHistoryCard
            serviceKey={activeTab}
            history={responseHistory[activeTab] ?? []}
            t={t}
          />

          {/* [NEW] Service Communication Map */}
          <ServiceCommunicationMap serviceKey={activeTab} services={services} t={t} />

          {/* Key Endpoints Card */}
          {SERVICE_DETAIL_META[activeTab] && (
            <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-accent" />
                <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.keyEndpoints')}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {SERVICE_DETAIL_META[activeTab].endpoints.map((ep) => (
                  <div key={ep} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-primary/50">
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded shrink-0">GET</span>
                    <span className="text-[12px] font-mono text-text-tertiary truncate">{ep}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
