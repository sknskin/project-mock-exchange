/**
 * @file User Auth 헬스 체크 컨트롤러
 * @description User Auth 서비스의 헬스 체크 엔드포인트를 제공합니다
 *
 * @file User Auth Health Controller
 * @description Provides health check endpoints for User Auth service
 */
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }

  @Get('startup')
  @HealthCheck()
  startup() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }
}
