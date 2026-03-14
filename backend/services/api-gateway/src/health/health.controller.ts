/**
 * @file API Gateway 헬스 체크 컨트롤러
 * @description Liveness, Readiness, Startup 프로브 및 내부 서비스 상태 프록시를 제공합니다
 *
 * @file API Gateway Health Controller
 * @description Provides liveness, readiness, startup probe endpoints and internal service health proxy
 */
import { Controller, Get, Param, Req, NotFoundException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { ProxyService } from '../proxy/proxy.service';

@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private health: HealthCheckService,
    private proxyService: ProxyService,
    private configService: ConfigService,
  ) {}

  @Get('services')
  @ApiOperation({ summary: '서비스 목록', description: '모든 마이크로서비스의 키, 포트 정보를 반환합니다' })
  @ApiResponse({ status: 200, description: '서비스 목록 반환' })
  getServiceList() {
    return {
      services: [
        { key: 'api-gateway', port: Number(this.configService.get('API_GATEWAY_PORT', 3000)) },
        { key: 'user-auth', port: Number(this.configService.get('USER_AUTH_PORT', 3007)) },
        { key: 'market-data', port: Number(this.configService.get('MARKET_DATA_PORT', 3001)) },
        { key: 'order-engine', port: Number(this.configService.get('ORDER_ENGINE_PORT', 3002)) },
        { key: 'portfolio', port: Number(this.configService.get('PORTFOLIO_PORT', 3003)) },
        { key: 'chat', port: Number(this.configService.get('CHAT_PORT', 3005)) },
        { key: 'ai-service', port: Number(this.configService.get('AI_SERVICE_PORT', 3006)) },
        { key: 'notification', port: Number(this.configService.get('NOTIFICATION_PORT', 3004)) },
      ],
    };
  }

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: '기본 헬스 체크', description: 'API Gateway가 정상인지 확인합니다' })
  @ApiResponse({ status: 200, description: '서비스 정상' })
  check() {
    return this.health.check([]);
  }

  @Get('live')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness 체크', description: '프로세스가 살아있는지 확인합니다' })
  @ApiResponse({ status: 200, description: '서비스 정상' })
  live() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness 체크', description: '트래픽을 받을 준비가 됐는지 확인합니다 (핵심 서비스 상태 포함)' })
  @ApiResponse({ status: 200, description: '서비스 준비 완료' })
  ready() {
    return this.health.check([
      // 핵심 다운스트림 서비스 헬스 프로브 / Probe critical downstream services
      () => this.probeDownstreamService('user-auth'),
      () => this.probeDownstreamService('market-data'),
      () => this.probeDownstreamService('order-engine'),
    ]);
  }

  @Get('startup')
  @HealthCheck()
  @ApiOperation({ summary: 'Startup 체크', description: '서비스 초기 시작이 완료됐는지 확인합니다' })
  @ApiResponse({ status: 200, description: '시작 완료' })
  startup() {
    return this.health.check([]);
  }

  @Get(':service')
  @ApiOperation({ summary: '내부 서비스 헬스 프록시', description: '지정된 마이크로서비스의 헬스 상태를 프록시합니다' })
  @ApiResponse({ status: 200, description: '서비스 상태 반환' })
  async checkService(@Param('service') service: string) {
    const serviceName = this.resolveService(service);

    try {
      const res = await this.proxyService.forward(serviceName, {
        method: 'GET',
        url: '/health/live',
        timeout: 3000,
      });
      return { status: 'up', ...(typeof res.data === 'object' ? res.data : {}) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { status: 'down', error: message };
    }
  }

  @Get(':service/detail')
  @ApiOperation({ summary: '서비스 상세 상태', description: '지정된 마이크로서비스의 live/ready/startup 프로브 및 서비스별 통계를 반환합니다' })
  @ApiResponse({ status: 200, description: '상세 상태 반환' })
  async getServiceDetail(@Param('service') service: string, @Req() req: Request) {
    const serviceName = this.resolveService(service);

    const probeCheck = async (probe: string) => {
      const start = Date.now();
      try {
        const res = await this.proxyService.forward(serviceName, {
          method: 'GET',
          url: `/health/${probe}`,
          timeout: 3000,
        });
        return {
          status: 'up' as const,
          responseTime: Date.now() - start,
          data: typeof res.data === 'object' ? res.data : {},
        };
      } catch {
        return { status: 'down' as const, responseTime: Date.now() - start, data: {} };
      }
    };

    const [live, ready, startup] = await Promise.all([
      probeCheck('live'),
      probeCheck('ready'),
      probeCheck('startup'),
    ]);

    // 서비스별 추가 통계 (Service-specific stats)
    let stats: unknown = null;
    const statsEndpoints: Record<string, { service: string; url: string }> = {
      'user-auth': { service: 'user-auth', url: '/statistics/overview' },
      'chat': { service: 'chat', url: '/statistics' },
      'market-data': { service: 'market-data', url: '/market/assets' },
    };
    const ep = statsEndpoints[service];
    if (ep) {
      try {
        const res = await this.proxyService.forward(ep.service, {
          method: 'GET',
          url: ep.url,
          timeout: 5000,
          headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {},
        });
        if (res.status >= 200 && res.status < 300) {
          stats = res.data;
        }
      } catch (e) {
        this.logger.debug?.(`Stats collection failed: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }

    return {
      service,
      probes: { live, ready, startup },
      stats,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * 다운스트림 서비스에 /health/ready 프로브를 보내 상태를 확인합니다.
   * DB 연결 상태를 포함한 전체 준비 상태를 검증합니다.
   *
   * Probe a downstream service via /health/ready and return a health indicator result.
   * This verifies full readiness including DB connectivity.
   */
  private async probeDownstreamService(service: string): Promise<HealthIndicatorResult> {
    try {
      const res = await this.proxyService.forward(service, {
        method: 'GET',
        url: '/health/ready',
        timeout: 3000,
      });
      // /health/ready 가 503을 반환하면 down으로 처리 / Treat 503 from /health/ready as down
      if (res.status >= 500) {
        return { [service]: { status: 'down' } };
      }
      return { [service]: { status: 'up' } };
    } catch {
      return { [service]: { status: 'down' } };
    }
  }

  private resolveService(service: string): string {
    const serviceMap: Record<string, string> = {
      'user-auth': 'user-auth',
      'market-data': 'market-data',
      'order-engine': 'order-engine',
      'portfolio': 'portfolio',
      'chat': 'chat',
      'ai-service': 'ai-service',
      'notification': 'notification',
    };
    const name = serviceMap[service];
    if (!name) throw new NotFoundException(`Unknown service: ${service}`);
    return name;
  }
}
