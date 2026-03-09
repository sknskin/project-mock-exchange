/**
 * @file User Auth 헬스 체크 컨트롤러
 * @description User Auth 서비스의 헬스 체크 엔드포인트를 제공합니다.
 *              DB 연결 확인을 위해 $queryRaw(SELECT 1)을 사용합니다.
 *
 * @file User Auth Health Controller
 * @description Provides health check endpoints for User Auth service.
 *              Uses $queryRaw(SELECT 1) for DB connectivity verification.
 */
import { Controller, Get, Logger } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
  ) {}

  /** 라이브니스 프로브 — 프로세스 생존 확인
   * Liveness probe — check process is alive */
  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  /** 레디니스 프로브 — DB 연결 포함 준비 상태 확인
   * Readiness probe — check readiness including DB connection */
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.checkDatabase(),
    ]);
  }

  /** 스타트업 프로브 — 서비스 시작 완료 확인
   * Startup probe — check service initialization complete */
  @Get('startup')
  @HealthCheck()
  startup() {
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
