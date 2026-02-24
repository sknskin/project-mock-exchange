/**
 * @file API Gateway 헬스 체크 컨트롤러
 * @description Liveness, Readiness, Startup 프로브를 제공합니다
 *
 * @file API Gateway Health Controller
 * @description Provides liveness, readiness, and startup probe endpoints
 */
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

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
}
