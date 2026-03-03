/**
 * @file Portfolio 헬스 체크 컨트롤러
 * @description Portfolio 서비스의 헬스 체크 엔드포인트를 제공합니다.
 *              DB 연결 확인을 위해 $queryRaw(SELECT 1)을 사용합니다.
 *
 * @file Portfolio Health Controller
 * @description Provides health check endpoints for Portfolio service.
 *              Uses $queryRaw(SELECT 1) for DB connectivity verification.
 */
import { Controller, Get, Logger } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../infrastructure/persistence/prisma/prisma.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.checkDatabase(),
    ]);
  }

  @Get('startup')
  @HealthCheck()
  startup(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.checkDatabase(),
    ]);
  }

  /**
   * DB 연결 상태를 SELECT 1 쿼리로 확인합니다.
   * 실패 시 503을 반환하도록 'down' 상태를 보고합니다.
   *
   * Verifies DB connectivity via SELECT 1.
   * Reports 'down' status (triggers 503) if the query fails.
   */
  private async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { database: { status: 'up' } };
    } catch (error) {
      this.logger.error(`Database health check failed: ${error instanceof Error ? error.message : error}`);
      return { database: { status: 'down' } };
    }
  }
}
