/**
 * @file API Gateway 헬스 체크 컨트롤러
 * @description Liveness, Readiness, Startup 프로브 및 내부 서비스 상태 프록시를 제공합니다
 *
 * @file API Gateway Health Controller
 * @description Provides liveness, readiness, startup probe endpoints and internal service health proxy
 */
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ProxyService } from '../proxy/proxy.service';

@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private proxyService: ProxyService,
  ) {}

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
  @ApiOperation({ summary: 'Readiness 체크', description: '트래픽을 받을 준비가 됐는지 확인합니다' })
  @ApiResponse({ status: 200, description: '서비스 준비 완료' })
  ready() {
    return this.health.check([]);
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
    const serviceMap: Record<string, string> = {
      'user-auth': 'user-auth',
      'market-data': 'market-data',
      'order-engine': 'order-engine',
      'portfolio': 'portfolio',
      'chat': 'chat',
      'ai-service': 'ai-service',
      'notification': 'notification',
    };

    const serviceName = serviceMap[service];
    if (!serviceName) {
      throw new NotFoundException(`Unknown service: ${service}`);
    }

    try {
      const res = await this.proxyService.forward(serviceName, {
        method: 'GET',
        url: '/health/live',
        timeout: 3000,
      });
      return { status: 'up', ...(typeof res.data === 'object' ? res.data : {}) };
    } catch {
      return { status: 'down' };
    }
  }
}
