/**
 * @file 관리자 헬스 모니터링 서브 컴포넌트
 * @description 아키텍처 다이어그램, 응답 시간 이력, 서비스 메트릭, 커뮤니케이션 맵 등
 *   코드 분할을 위해 메인 페이지에서 추출됨.
 *
 * @file Admin health monitoring sub-components
 * @description Architecture diagram, response time history, service metrics, communication map, etc.
 *   Extracted from the main page for code-splitting.
 */
'use client';

import React from 'react';
import {
  Database, Cpu, Clock, Zap, Link2, Layers,
  BarChart3, Monitor, HardDrive, FileText, RotateCcw, ArrowRight, ArrowLeft,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/format';
import type { TranslationKey } from '@/lib/i18n';

// ===== 타입 재선언 — 순환 의존 방지 / Type re-declarations — prevents circular dependency =====
type HealthStatus = 'healthy' | 'unhealthy' | 'checking';

export interface ServiceHealth {
  key: string;
  status: HealthStatus;
  responseTime?: number;
  lastChecked?: Date;
}

interface ServiceMeta {
  tech: string[];
  db?: string;
  deps: string[];
  endpoints: string[];
  protocol: string;
  detailKey: string;
}

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
const SERVICE_DB_SCHEMAS: Record<string, string[]> = {
  'user-auth': ['User', 'Session', 'PageView', 'Announcement', 'SystemSetting'],
  'market-data': ['Asset', 'Candle', 'News', 'PriceHistory'],
  'order-engine': ['Order', 'OrderEvent', 'TradeExecution'],
  'portfolio': ['Portfolio', 'Holding', 'Transaction', 'Balance'],
  'chat': ['Room', 'Message', 'Participant', 'ReadReceipt'],
};

const MAX_HISTORY = 5;

/** 정보 행 — 라벨/값 한 줄 표시
 * Info row — displays label/value on a single line */
export function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-text-quaternary shrink-0">{label}</span>
      <span className={cn('text-[12px] text-text-tertiary text-right truncate', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

/** 프로브 행 — 서비스 프로브 상태/응답 시간 표시
 * Probe row — displays service probe status and response time */
export function ProbeRow({ label, status, responseTime, data }: {
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

/** 시스템 리소스 요약 셀 — 아이콘+값+라벨 카드
 * System resource summary cell — icon+value+label card */
export function SummaryCell({ label, value, sub, icon, color }: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-bg-primary/50 rounded-xl px-4 py-3 text-center">
      <div className={cn('flex justify-center mb-1.5', color)}>{icon}</div>
      <div className={cn('text-[18px] font-bold tabular-nums', color)}>{value}</div>
      <div className="text-[11px] text-text-quaternary mt-0.5">{label}</div>
      <div className="text-[10px] text-text-quaternary/60 mt-0.5">{sub}</div>
    </div>
  );
}

/** 아키텍처 다이어그램 — 마이크로서비스 구조 및 상태를 시각적으로 표시
 * Architecture diagram — visualizes microservice structure and status */
export function ArchitectureDiagram({ services, t }: {
  services: ServiceHealth[];
  t: (key: TranslationKey) => string;
}) {
  const getStatusDot = (key: string) => {
    const svc = services.find((s) => s.key === key);
    if (!svc) return 'text-text-quaternary';
    return svc.status === 'healthy' ? 'text-emerald-400' : svc.status === 'unhealthy' ? 'text-red-400' : 'text-text-quaternary';
  };

  const getStatusChar = (key: string) => {
    const svc = services.find((s) => s.key === key);
    if (!svc || svc.status === 'checking') return '~';
    return svc.status === 'healthy' ? '+' : 'x';
  };

  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const unhealthyCount = services.filter((s) => s.status === 'unhealthy').length;
  const checkingCount = services.filter((s) => s.status === 'checking').length;
  const totalMs = services.reduce((s, sv) => s + (sv.responseTime ?? 0), 0);

  return (
    <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-4 h-4 text-accent" />
        <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.architectureDiagram')}</h3>
      </div>
      <p className="text-[12px] text-text-quaternary mb-4">{t('admin.health.architectureDiagramDesc')}</p>

      <div className="flex flex-col lg:flex-row lg:gap-10">
        {/* Diagram */}
        <div className="overflow-x-auto shrink-0">
          <pre className="text-[11px] leading-[1.6] font-mono whitespace-pre">
            <span className="text-text-quaternary">{'                    +-----------+\n'}</span>
            <span className="text-text-quaternary">{'     Client  -----> '}</span>
            <span className={getStatusDot('api-gateway')}>{'|  Gateway  |'}</span>
            <span className="text-text-quaternary">{` [${getStatusChar('api-gateway')}]\n`}</span>
            <span className="text-text-quaternary">{'     (Next.js)      '}</span>
            <span className={getStatusDot('api-gateway')}>{'| :3000     |'}</span>
            <span className="text-text-quaternary">{'\n'}</span>
            <span className="text-text-quaternary">{'                    +-----------+\n'}</span>
            <span className="text-text-quaternary">{'                         |\n'}</span>
            <span className="text-text-quaternary">{'          +--------------+---------------+\n'}</span>
            <span className="text-text-quaternary">{'          |              |               |\n'}</span>
            <span className="text-text-quaternary">{'    +-----+----+   +-----+-----+  +------+------+\n'}</span>
            <span className={getStatusDot('user-auth')}>{'    | UserAuth |'}</span>
            <span className="text-text-quaternary">{'   '}</span>
            <span className={getStatusDot('market-data')}>{'| MarketData |'}</span>
            <span className="text-text-quaternary">{'  '}</span>
            <span className={getStatusDot('order-engine')}>{'| OrderEngine |'}</span>
            <span className="text-text-quaternary">{'\n'}</span>
            <span className={getStatusDot('user-auth')}>{`    | :3007 [${getStatusChar('user-auth')}] |`}</span>
            <span className="text-text-quaternary">{'   '}</span>
            <span className={getStatusDot('market-data')}>{`| :3001  [${getStatusChar('market-data')}] |`}</span>
            <span className="text-text-quaternary">{'  '}</span>
            <span className={getStatusDot('order-engine')}>{`| :3002   [${getStatusChar('order-engine')}] |`}</span>
            <span className="text-text-quaternary">{'\n'}</span>
            <span className="text-text-quaternary">{'    +----------+   +----------+-+  +------+------+\n'}</span>
            <span className="text-text-quaternary">{'          |              |                |\n'}</span>
            <span className="text-text-quaternary">{'       [Prisma]      [Prisma]         [Prisma]\n'}</span>
            <span className="text-text-quaternary">{'       mex_auth      mex_market       mex_orders\n'}</span>
            <span className="text-text-quaternary">{'                                        |\n'}</span>
            <span className="text-text-quaternary">{'          +--------------+---------------+\n'}</span>
            <span className="text-text-quaternary">{'          |              |               |\n'}</span>
            <span className="text-text-quaternary">{'    +-----+----+  +------+-----+  +-----+-------+\n'}</span>
            <span className={getStatusDot('portfolio')}>{'    |Portfolio |'}</span>
            <span className="text-text-quaternary">{'  '}</span>
            <span className={getStatusDot('notification')}>{'| Notificat. |'}</span>
            <span className="text-text-quaternary">{'  '}</span>
            <span className={getStatusDot('chat')}>{'|    Chat     |'}</span>
            <span className="text-text-quaternary">{'\n'}</span>
            <span className={getStatusDot('portfolio')}>{`    | :3003 [${getStatusChar('portfolio')}] |`}</span>
            <span className="text-text-quaternary">{'  '}</span>
            <span className={getStatusDot('notification')}>{`| :3004  [${getStatusChar('notification')}] |`}</span>
            <span className="text-text-quaternary">{'  '}</span>
            <span className={getStatusDot('chat')}>{`| :3005   [${getStatusChar('chat')}] |`}</span>
            <span className="text-text-quaternary">{'\n'}</span>
            <span className="text-text-quaternary">{'    +----------+  +------------+  +-------------+\n'}</span>
            <span className="text-text-quaternary">{'       [Prisma]                       [Prisma]\n'}</span>
            <span className="text-text-quaternary">{'       mex_portfolio                  mex_chat\n'}</span>
            <span className="text-text-quaternary">{'                        |\n'}</span>
            <span className="text-text-quaternary">{'                  +-----+------+\n'}</span>
            <span className={getStatusDot('ai-service')}>{'                  | AI Service |'}</span>
            <span className="text-text-quaternary">{'\n'}</span>
            <span className={getStatusDot('ai-service')}>{`                  | :3006  [${getStatusChar('ai-service')}] |`}</span>
            <span className="text-text-quaternary">{'\n'}</span>
            <span className="text-text-quaternary">{'                  +------------+\n'}</span>
            <span className="text-text-quaternary">{'                    [Claude API]\n'}</span>
          </pre>
        </div>

        {/* Service status sidebar — desktop only */}
        <div className="hidden lg:flex flex-col gap-3 flex-1 min-w-[220px] pt-1">
          {/* Quick summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-500/10 rounded-xl px-3 py-2.5 text-center">
              <div className="text-[18px] font-bold text-emerald-400 tabular-nums">{healthyCount}</div>
              <div className="text-[10px] text-emerald-400/70">Healthy</div>
            </div>
            <div className="bg-red-500/10 rounded-xl px-3 py-2.5 text-center">
              <div className="text-[18px] font-bold text-red-400 tabular-nums">{unhealthyCount}</div>
              <div className="text-[10px] text-red-400/70">Down</div>
            </div>
            <div className="bg-text-quaternary/10 rounded-xl px-3 py-2.5 text-center">
              <div className="text-[18px] font-bold text-text-quaternary tabular-nums">{checkingCount}</div>
              <div className="text-[10px] text-text-quaternary/70">Checking</div>
            </div>
          </div>
          <div className="text-[11px] text-text-quaternary text-center tabular-nums">
            {t('admin.health.totalResponseTime')}: {totalMs}ms
          </div>
          {/* Per-service list */}
          <div className="space-y-1.5 flex-1">
            {services.map((svc) => (
              <div key={svc.key} className="flex items-center gap-2 px-3 py-1.5 bg-bg-primary/50 rounded-lg">
                <span className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  svc.status === 'healthy' ? 'bg-emerald-400' : svc.status === 'unhealthy' ? 'bg-red-400' : 'bg-text-quaternary',
                )} />
                <span className="text-[12px] text-text-secondary flex-1 truncate">{svc.key}</span>
                <span className={cn(
                  'text-[11px] font-mono tabular-nums',
                  svc.status === 'healthy' ? 'text-emerald-400' : svc.status === 'unhealthy' ? 'text-red-400' : 'text-text-quaternary',
                )}>
                  {svc.responseTime != null ? `${svc.responseTime}ms` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend — mobile */}
      <div className="flex items-center gap-4 mt-3 text-[11px] text-text-quaternary lg:hidden">
        <span className="flex items-center gap-1">
          <span className="text-emerald-400">[+]</span> Healthy
        </span>
        <span className="flex items-center gap-1">
          <span className="text-red-400">[x]</span> Down
        </span>
        <span className="flex items-center gap-1">
          <span className="text-text-quaternary">[~]</span> Checking
        </span>
      </div>
    </div>
  );
}

/** 응답 시간 이력 카드 — 최근 응답 시간을 바 차트로 표시
 * Response time history card — displays recent response times as bar chart */
export function ResponseTimeHistoryCard({ serviceKey: _serviceKey, history, t }: {
  serviceKey: string;
  history: number[];
  t: (key: TranslationKey) => string;
}) {
  const maxTime = Math.max(...history, 1);

  return (
    <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-accent" />
        <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.responseHistory')}</h3>
      </div>
      <p className="text-[12px] text-text-quaternary mb-4">{t('admin.health.responseHistoryDesc')}</p>

      {history.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <Clock className="w-4 h-4 text-text-quaternary mr-2" />
          <span className="text-[13px] text-text-quaternary">{t('admin.health.noHistory')}</span>
        </div>
      ) : (
        <div className="flex items-end gap-3 h-[120px]">
          {history.map((time, idx) => {
            const heightPct = Math.max((time / maxTime) * 100, 8);
            const color = time < 200 ? 'bg-emerald-400' : time < 1000 ? 'bg-yellow-400' : 'bg-red-400';
            return (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <span className={cn(
                  'text-[10px] font-mono tabular-nums',
                  time < 200 ? 'text-emerald-400' : time < 1000 ? 'text-yellow-400' : 'text-red-400',
                )}>
                  {time}ms
                </span>
                <div
                  className={cn('w-full rounded-t-lg transition-all', color)}
                  style={{ height: `${heightPct}%`, minHeight: '8px' }}
                />
                <span className="text-[10px] text-text-quaternary">#{idx + 1}</span>
              </div>
            );
          })}
          {/* 빈 슬롯 표시 (Show empty slots) */}
          {Array.from({ length: MAX_HISTORY - history.length }).map((_, idx) => (
            <div key={`empty-${idx}`} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <span className="text-[10px] text-text-quaternary/40">--</span>
              <div className="w-full rounded-t-lg bg-border/30" style={{ height: '8px' }} />
              <span className="text-[10px] text-text-quaternary/40">#{history.length + idx + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 환경 정보 카드 — 서비스 실행 환경(Node, OS 등) 표시
 * Environment info card — displays service runtime environment (Node, OS, etc.) */
export function EnvironmentInfoCard({ serviceKey, t }: {
  serviceKey: string;
  t: (key: TranslationKey) => string;
}) {
  return (
    <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Monitor className="w-4 h-4 text-accent" />
        <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.envInfo')}</h3>
      </div>
      <div className="space-y-3">
        <InfoRow label={t('admin.health.nodeEnv')} value="development" />
        <InfoRow label={t('admin.health.serviceVersion')} value="1.0.0" mono />
        <InfoRow label={t('admin.health.memoryUsage')} value="~128 MB" mono />
        <InfoRow label={t('admin.health.processUptime')} value="--:--:--" mono />
        <InfoRow label={t('admin.health.logLevel')} value={SERVICE_LOG_LEVELS[serviceKey] ?? 'info'} />
      </div>
    </div>
  );
}

/** 데이터베이스 정보 카드 — DB 연결 상태 및 엔티티 목록 표시
 * Database info card — displays DB connection status and entity list */
export function DatabaseInfoCard({ serviceKey, serviceHealth, t }: {
  serviceKey: string;
  serviceHealth?: ServiceHealth;
  t: (key: TranslationKey) => string;
}) {
  const meta = SERVICE_DETAIL_META[serviceKey];
  if (!meta?.db) return null;

  const schemas = SERVICE_DB_SCHEMAS[serviceKey] ?? [];
  const isConnected = serviceHealth?.status === 'healthy';

  return (
    <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <HardDrive className="w-4 h-4 text-accent" />
        <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.dbInfo')}</h3>
      </div>
      <div className="space-y-3">
        <InfoRow label={t('admin.health.dbName')} value={meta.db} mono />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-text-quaternary shrink-0">{t('admin.health.dbConnection')}</span>
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-emerald-400' : 'bg-red-400')} />
            <span className={cn('text-[12px] font-semibold', isConnected ? 'text-emerald-400' : 'text-red-400')}>
              {isConnected ? t('admin.health.dbConnected') : t('admin.health.dbDisconnected')}
            </span>
          </div>
        </div>
        {schemas.length > 0 && (
          <div>
            <span className="text-[12px] text-text-quaternary block mb-2">{t('admin.health.dbSchema')}</span>
            <div className="flex flex-wrap gap-1.5">
              {schemas.map((schema) => (
                <span key={schema} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[11px] font-mono">
                  {schema}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 로그 레벨 뱃지 — debug/info/warn 레벨을 색상 구분 표시
 * Log level badge — color-coded debug/info/warn display */
export function LogLevelBadge({ level, t: _t }: {
  level: 'debug' | 'info' | 'warn';
  t: (key: TranslationKey) => string;
}) {
  const config = {
    debug: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    info: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    warn: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  };
  const c = config[level];
  return (
    <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border', c.bg, c.text, c.border)}>
      {level}
    </span>
  );
}

/** 서비스 통신 맵 — 마이크로서비스 간 의존 관계를 시각적으로 표시
 * Service communication map — visualizes inter-service dependencies */
export function ServiceCommunicationMap({ serviceKey, services: svcHealth, t }: {
  serviceKey: string;
  services: ServiceHealth[];
  t: (key: TranslationKey) => string;
}) {
  const meta = SERVICE_DETAIL_META[serviceKey];
  if (!meta) return null;

  // 이 서비스가 호출하는 다른 서비스 (microservices only)
  // Services this service calls (microservices only)
  const outgoing = meta.deps.filter((dep) => SERVICE_DETAIL_META[dep]);

  // 이 서비스를 호출하는 서비스들 (Services that call this service)
  const incoming = Object.entries(SERVICE_DETAIL_META)
    .filter(([key, m]) => key !== serviceKey && m.deps.includes(serviceKey))
    .map(([key]) => key);

  return (
    <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-4 h-4 text-accent" />
        <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.commMap')}</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Outgoing calls */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[12px] font-semibold text-text-secondary">{t('admin.health.callsTo')}</span>
          </div>
          {outgoing.length === 0 ? (
            <p className="text-[12px] text-text-quaternary pl-5">{t('admin.health.noOutgoing')}</p>
          ) : (
            <div className="space-y-1.5">
              {outgoing.map((dep) => {
                const health = svcHealth.find((s) => s.key === dep);
                const nameKey = SERVICE_META.find((m) => m.key === dep)?.nameKey;
                return (
                  <div key={dep} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-primary/50">
                    <ArrowRight className="w-3 h-3 text-blue-400 shrink-0" />
                    {health && (
                      <span className={cn('w-2 h-2 rounded-full shrink-0', health.status === 'healthy' ? 'bg-emerald-400' : health.status === 'unhealthy' ? 'bg-red-400' : 'bg-text-quaternary')} />
                    )}
                    <span className="text-[12px] text-text-primary">
                      {nameKey ? dep : dep}
                    </span>
                    {health && (
                      <span className={cn('text-[10px] ml-auto font-mono', health.status === 'healthy' ? 'text-emerald-400' : 'text-red-400')}>
                        {health.responseTime ?? '--'}ms
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Incoming calls */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[12px] font-semibold text-text-secondary">{t('admin.health.calledBy')}</span>
          </div>
          {incoming.length === 0 ? (
            <p className="text-[12px] text-text-quaternary pl-5">{t('admin.health.noIncoming')}</p>
          ) : (
            <div className="space-y-1.5">
              {incoming.map((caller) => {
                const health = svcHealth.find((s) => s.key === caller);
                return (
                  <div key={caller} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-primary/50">
                    <ArrowLeft className="w-3 h-3 text-purple-400 shrink-0" />
                    {health && (
                      <span className={cn('w-2 h-2 rounded-full shrink-0', health.status === 'healthy' ? 'bg-emerald-400' : health.status === 'unhealthy' ? 'bg-red-400' : 'bg-text-quaternary')} />
                    )}
                    <span className="text-[12px] text-text-primary">{caller}</span>
                    {health && (
                      <span className={cn('text-[10px] ml-auto font-mono', health.status === 'healthy' ? 'text-emerald-400' : 'text-red-400')}>
                        {health.responseTime ?? '--'}ms
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 빠른 작업 카드 — 서비스 재시작/로그 확인 등 빠른 액션
 * Quick actions card — service restart, view logs, etc. */
export function QuickActionsCard({ serviceKey: _serviceKey, t }: {
  serviceKey: string;
  t: (key: TranslationKey) => string;
}) {
  return (
    <div className="bg-bg-secondary rounded-2xl p-5 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-accent" />
        <h3 className="text-[14px] font-bold text-text-primary">{t('admin.health.quickActions')}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-bg-primary/50 text-[12px] font-semibold text-text-secondary hover:bg-bg-primary transition-colors cursor-not-allowed opacity-60"
          disabled
          title="Log viewer - coming soon"
        >
          <FileText className="w-3.5 h-3.5" />
          {t('admin.health.viewLogs')}
          <span className="text-[10px] ml-1 opacity-70">({t('admin.health.restartDisabled')})</span>
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/5 text-[12px] font-semibold text-red-400/60 cursor-not-allowed opacity-60"
          disabled
          title="Restart service - disabled for safety"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t('admin.health.restart')}
          <span className="text-[10px] ml-1 opacity-70">({t('admin.health.restartDisabled')})</span>
        </button>
      </div>
    </div>
  );
}

/** 서비스 메트릭 카드 — 서비스별 상세 통계 지표 표시
 * Service metrics card — displays detailed service-specific statistics */
export function ServiceMetricsCard({ serviceKey, stats, loading, t }: {
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

/** 메트릭 그리드 — 아이콘+라벨+값 형태의 메트릭을 그리드로 표시
 * Metrics grid — displays icon+label+value metrics in a grid layout */
export function MetricsGrid({ title, metrics }: {
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
