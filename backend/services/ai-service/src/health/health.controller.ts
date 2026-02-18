/**
 * @file AI Service 헬스 체크 컨트롤러
 * @description AI Service의 헬스 체크 엔드포인트를 제공합니다
 *
 * @file AI Service Health Controller
 * @description Provides health check endpoints for AI service
 */
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('startup')
  @HealthCheck()
  startup(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }
}
