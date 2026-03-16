/**
 * @file 카피 트레이딩 서비스
 * @description 카피 트레이딩 설정 관리 및 주문 복제 비즈니스 로직을 처리합니다
 *
 * @file Copy Trading Service
 * @description Handles copy trading configuration management and order replication logic
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import Decimal from 'decimal.js';
import axios from 'axios';

export interface TradeData {
  symbol: string;
  side: string;
  quantity: string;
  price: string;
  tradeId: string;
}

/**
 * 카피 트레이딩 기본 상수값 — ConfigService / 환경 변수로 재정의 가능
 * Copy trading default constants — overridable via ConfigService / environment variables
 */
const COPY_TRADE_DEFAULTS = {
  /** 슬리피지 허용 비율 (2%) / Slippage tolerance (2%) */
  SLIPPAGE_TOLERANCE: 0.02,
  /** 팔로워당 최대 카피 트레이딩 대상 수 / Max copy trade targets per follower */
  MAX_COPY_TRADE_TARGETS: 10,
  /** 순환 참조 탐지 최대 깊이 / Max depth for cycle detection */
  MAX_CYCLE_DEPTH: 5,
  /** 주문 전송 타임아웃 (ms) / Order request timeout (ms) */
  ORDER_TIMEOUT_MS: 5000,
} as const;

@Injectable()
export class CopyTradeService {
  private readonly logger = new Logger(CopyTradeService.name);
  private readonly orderEngineUrl: string;
  private readonly internalToken: string;
  private readonly slippageTolerance: number;
  private readonly maxCopyTradeTargets: number;
  private readonly maxCycleDepth: number;
  private readonly orderTimeoutMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.orderEngineUrl = this.config.get<string>(
      'ORDER_ENGINE_URL',
      'http://localhost:3004',
    );
    this.internalToken = this.config.get<string>('INTERNAL_SERVICE_SECRET', '');
    this.slippageTolerance = this.config.get<number>(
      'COPY_TRADE_SLIPPAGE_TOLERANCE',
      COPY_TRADE_DEFAULTS.SLIPPAGE_TOLERANCE,
    );
    this.maxCopyTradeTargets = this.config.get<number>(
      'COPY_TRADE_MAX_TARGETS',
      COPY_TRADE_DEFAULTS.MAX_COPY_TRADE_TARGETS,
    );
    this.maxCycleDepth = this.config.get<number>(
      'COPY_TRADE_MAX_CYCLE_DEPTH',
      COPY_TRADE_DEFAULTS.MAX_CYCLE_DEPTH,
    );
    this.orderTimeoutMs = this.config.get<number>(
      'COPY_TRADE_ORDER_TIMEOUT_MS',
      COPY_TRADE_DEFAULTS.ORDER_TIMEOUT_MS,
    );
  }

  /**
   * 카피 트레이딩을 시작합니다.
   * Start copy trading for a follower-trader pair.
   */
  async startCopyTrading(
    followerId: string,
    traderId: string,
    config: { scaleRatio: number; maxInvestment: number; stopLossPercent?: number },
  ) {
    // 자기 자신을 카피할 수 없음 / Cannot copy yourself
    if (followerId === traderId) {
      throw new BadRequestException('Cannot copy your own trades');
    }

    // 순환 참조 방지 — 대상 트레이더가 직접 또는 간접적으로 팔로워를 이미 카피 중인지 확인 (최대 5단계)
    // Circular reference prevention — check if the target trader already copies the follower directly or transitively (max depth 5)
    const hasCycle = await this.detectCopyCycle(traderId, followerId, this.maxCycleDepth);
    if (hasCycle) {
      throw new BadRequestException(
        'Circular copy trading detected: the target trader already copies you directly or indirectly',
      );
    }

    // 기존 설정이 있는지 확인 / Check for existing config
    const existing = await this.prisma.copyTradeConfig.findUnique({
      where: { followerId_traderId: { followerId, traderId } },
    });

    if (existing && existing.isActive) {
      throw new BadRequestException('Copy trading is already active for this trader');
    }

    // 팔로워의 활성 카피 트레이딩 수 제한 확인 (#9)
    // Check active copy trade count limit for follower (#9)
    const activeCount = await this.prisma.copyTradeConfig.count({
      where: { followerId, isActive: true },
    });

    if (activeCount >= this.maxCopyTradeTargets) {
      throw new BadRequestException(`Maximum ${this.maxCopyTradeTargets} copy trade targets allowed`);
    }

    // 기존 비활성 설정이 있으면 재활성화, 없으면 새로 생성
    // Reactivate existing inactive config or create new one
    if (existing) {
      const updated = await this.prisma.copyTradeConfig.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          scaleRatio: config.scaleRatio,
          maxInvestment: config.maxInvestment,
          stopLossPercent: config.stopLossPercent ?? null,
          totalInvested: 0,
        },
      });

      this.logger.log(
        `Reactivated copy trading: follower=${followerId.substring(0, 8)}..., trader=${traderId.substring(0, 8)}...`,
      );

      return this.toConfigResponse(updated);
    }

    const created = await this.prisma.copyTradeConfig.create({
      data: {
        followerId,
        traderId,
        scaleRatio: config.scaleRatio,
        maxInvestment: config.maxInvestment,
        stopLossPercent: config.stopLossPercent ?? null,
      },
    });

    this.logger.log(
      `Started copy trading: follower=${followerId.substring(0, 8)}..., trader=${traderId.substring(0, 8)}...`,
    );

    return this.toConfigResponse(created);
  }

  /**
   * 카피 트레이딩 설정을 업데이트합니다.
   * Update copy trading configuration.
   */
  async updateConfig(
    followerId: string,
    traderId: string,
    updates: { scaleRatio?: number; maxInvestment?: number; stopLossPercent?: number },
  ) {
    const existing = await this.prisma.copyTradeConfig.findUnique({
      where: { followerId_traderId: { followerId, traderId } },
    });

    if (!existing) {
      throw new NotFoundException('Copy trading config not found');
    }

    const data: Record<string, any> = {};
    if (updates.scaleRatio !== undefined) data.scaleRatio = updates.scaleRatio;
    if (updates.maxInvestment !== undefined) data.maxInvestment = updates.maxInvestment;
    if (updates.stopLossPercent !== undefined) data.stopLossPercent = updates.stopLossPercent;

    const updated = await this.prisma.copyTradeConfig.update({
      where: { id: existing.id },
      data,
    });

    this.logger.log(
      `Updated copy trading config: follower=${followerId.substring(0, 8)}..., trader=${traderId.substring(0, 8)}...`,
    );

    return this.toConfigResponse(updated);
  }

  /**
   * 카피 트레이딩을 중지합니다 (소프트 삭제 — 데이터 보존).
   * Stop copy trading (soft delete — data is preserved, never deleted).
   */
  async stopCopyTrading(followerId: string, traderId: string) {
    const existing = await this.prisma.copyTradeConfig.findUnique({
      where: { followerId_traderId: { followerId, traderId } },
    });

    if (!existing) {
      throw new NotFoundException('Copy trading config not found');
    }

    const updated = await this.prisma.copyTradeConfig.update({
      where: { id: existing.id },
      data: { isActive: false },
    });

    // 해당 설정의 PENDING 상태 실행 기록을 CANCELLED로 변경 (#6)
    // Cancel any PENDING execution records for this config (#6)
    const cancelled = await this.prisma.copyTradeExecution.updateMany({
      where: {
        configId: existing.id,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
        failReason: 'Copy trading deactivated by user',
      },
    });

    this.logger.log(
      `Stopped copy trading: follower=${followerId.substring(0, 8)}..., trader=${traderId.substring(0, 8)}... (cancelled ${cancelled.count} pending executions)`,
    );

    return this.toConfigResponse(updated);
  }

  /**
   * 특정 팔로워-트레이더 쌍의 카피 트레이딩 설정을 조회합니다.
   * Get copy trading config for a follower-trader pair.
   */
  async getConfig(followerId: string, traderId: string) {
    const config = await this.prisma.copyTradeConfig.findUnique({
      where: { followerId_traderId: { followerId, traderId } },
    });

    return config ? this.toConfigResponse(config) : null;
  }

  /**
   * 팔로워의 모든 카피 트레이딩 설정을 조회합니다.
   * Get all copy trading configs for a follower.
   */
  async getMyConfigs(followerId: string) {
    const configs = await this.prisma.copyTradeConfig.findMany({
      where: { followerId },
      orderBy: { createdAt: 'desc' },
    });

    return configs.map((c) => this.toConfigResponse(c));
  }

  /**
   * 팔로워의 카피 트레이딩 실행 내역을 페이지네이션으로 조회합니다.
   * Get paginated copy trade execution history for a follower.
   */
  async getExecutionHistory(followerId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [executions, total] = await Promise.all([
      this.prisma.copyTradeExecution.findMany({
        where: { followerId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.copyTradeExecution.count({
        where: { followerId },
      }),
    ]);

    return {
      data: executions.map((e) => this.toExecutionResponse(e)),
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  }

  /**
   * 카피 트레이딩 핵심 로직 — 트레이더의 거래를 팔로워들에게 복제합니다.
   * Core copy trading logic — replicates a trader's trade to all active followers.
   *
   * 1. 해당 트레이더의 활성 카피 설정을 모두 조회
   * 2. 각 설정에 대해: 스케일링된 수량 계산, 최대 투자 한도 확인
   * 3. order-engine에 HTTP 요청으로 주문 전송
   * 4. CopyTradeExecution 기록 생성
   * 5. 실패 시: status='FAILED', failReason 기록
   *
   * 1. Find all active copy configs for the trader
   * 2. For each config: calculate scaled quantity, check max investment limit
   * 3. Send order to order-engine via HTTP
   * 4. Create CopyTradeExecution record
   * 5. On failure: set status='FAILED' with failReason
   */
  async processCopyTrade(traderId: string, tradeData: TradeData) {
    // 해당 트레이더를 카피하는 활성 설정 조회
    // Find all active configs copying this trader
    const configs = await this.prisma.copyTradeConfig.findMany({
      where: {
        traderId,
        isActive: true,
      },
    });

    if (configs.length === 0) {
      return;
    }

    this.logger.log(
      `Processing copy trade for trader ${traderId.substring(0, 8)}...: ${configs.length} active followers`,
    );

    const originalQty = new Decimal(tradeData.quantity);
    const price = new Decimal(tradeData.price);

    // 병렬 처리 — 각 팔로워의 카피 트레이딩을 동시에 실행하여 지연 최소화
    // Parallel processing — execute copy trades for all followers concurrently to minimize latency
    await Promise.allSettled(configs.map(async (config) => {
      try {
        // 스케일링된 수량 계산 / Calculate scaled quantity
        const scaleRatio = new Decimal(config.scaleRatio.toString());
        const copiedQty = originalQty.mul(scaleRatio);
        const investmentAmount = copiedQty.mul(price);

        // 슬리피지 보호 (#8): 가격 변동 경고 로깅
        // Slippage protection (#8): log warning for price deviation
        // TODO: 실시간 시장 가격을 가져와 원래 거래 가격과 비교하는 로직 확장 필요
        // TODO: Expand to fetch real-time market price and compare against original trade price
        const tradePrice = new Decimal(tradeData.price);
        if (!tradePrice.isZero()) {
          this.logger.debug(
            `Slippage check: symbol=${tradeData.symbol}, tradePrice=${tradePrice.toFixed(8)}, tolerance=${this.slippageTolerance * 100}%`,
          );
        }

        // 레이스 컨디션 방지를 위해 트랜잭션 내에서 totalInvested 읽기+확인+갱신 (#2)
        // Use transaction with FOR UPDATE lock to prevent race condition on totalInvested (#2)
        if (tradeData.side === 'BUY') {
          const budgetCheckResult = await this.prisma.$transaction(async (tx) => {
            // FOR UPDATE 잠금으로 최신 설정 조회 / Read latest config with FOR UPDATE lock
            const [lockedConfig] = await tx.$queryRawUnsafe<any[]>(
              `SELECT "total_invested" AS "totalInvested", "max_investment" AS "maxInvestment" FROM "copy_trade_configs" WHERE "id" = $1 FOR UPDATE`,
              config.id,
            );

            if (!lockedConfig) {
              return { skip: true, reason: 'Config not found during transaction' };
            }

            const currentTotalInvested = new Decimal(lockedConfig.totalInvested.toString());
            const currentMaxInvestment = new Decimal(lockedConfig.maxInvestment.toString());
            const remainingBudget = currentMaxInvestment.minus(currentTotalInvested);

            if (investmentAmount.gt(remainingBudget)) {
              return {
                skip: true,
                reason: `Max investment limit exceeded: invested=${currentTotalInvested.toFixed(2)}, limit=${currentMaxInvestment.toFixed(2)}, required=${investmentAmount.toFixed(2)}`,
                totalInvested: currentTotalInvested,
              };
            }

            // 한도 내이면 totalInvested 즉시 갱신 / Update totalInvested immediately if within limit
            await tx.copyTradeConfig.update({
              where: { id: config.id },
              data: {
                totalInvested: currentTotalInvested.plus(investmentAmount).toFixed(8),
              },
            });

            return { skip: false, totalInvested: currentTotalInvested };
          });

          if (budgetCheckResult.skip) {
            // 한도 초과 시 실패 기록 / Record failure if limit exceeded
            await this.prisma.copyTradeExecution.create({
              data: {
                configId: config.id,
                followerId: config.followerId,
                traderId,
                originalTradeId: tradeData.tradeId,
                symbol: tradeData.symbol,
                side: tradeData.side,
                originalQty: originalQty.toFixed(8),
                copiedQty: copiedQty.toFixed(8),
                price: price.toFixed(8),
                status: 'FAILED',
                failReason: budgetCheckResult.reason,
              },
            });

            this.logger.warn(
              `Copy trade skipped: follower=${config.followerId.substring(0, 8)}..., trader=${traderId.substring(0, 8)}..., symbol=${tradeData.symbol}, reason=${budgetCheckResult.reason}`,
            );
            return;
          }
        }

        // order-engine에 주문 전송 / Send order to order-engine
        let copiedOrderId: string | null = null;
        try {
          const orderResponse = await axios.post(
            `${this.orderEngineUrl}/orders`,
            {
              symbol: tradeData.symbol,
              side: tradeData.side,
              type: 'MARKET',
              quantity: copiedQty.toFixed(8),
            },
            {
              timeout: this.orderTimeoutMs,
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': config.followerId,
                'x-internal-token': this.internalToken,
              },
            },
          );

          copiedOrderId = orderResponse.data?.data?.id || orderResponse.data?.data?.orderId || null;
        } catch (orderError: any) {
          // 주문 실패 시 기록 / Record order failure
          const reason = orderError?.response?.data?.message
            || orderError?.message
            || 'Unknown order error';

          await this.prisma.copyTradeExecution.create({
            data: {
              configId: config.id,
              followerId: config.followerId,
              traderId,
              originalTradeId: tradeData.tradeId,
              symbol: tradeData.symbol,
              side: tradeData.side,
              originalQty: originalQty.toFixed(8),
              copiedQty: copiedQty.toFixed(8),
              price: price.toFixed(8),
              status: 'FAILED',
              failReason: reason.substring(0, 500),
            },
          });

          this.logger.warn(
            `Copy trade order failed: follower=${config.followerId.substring(0, 8)}..., trader=${traderId.substring(0, 8)}..., symbol=${tradeData.symbol}, reason=${reason}`,
          );
          return;
        }

        // 성공 시 실행 기록 생성 (BUY의 경우 totalInvested는 이미 트랜잭션에서 갱신됨)
        // On success: create execution record (totalInvested already updated in transaction for BUY)
        await this.prisma.copyTradeExecution.create({
          data: {
            configId: config.id,
            followerId: config.followerId,
            traderId,
            originalTradeId: tradeData.tradeId,
            copiedOrderId,
            symbol: tradeData.symbol,
            side: tradeData.side,
            originalQty: originalQty.toFixed(8),
            copiedQty: copiedQty.toFixed(8),
            price: price.toFixed(8),
            status: 'EXECUTED',
          },
        });

        this.logger.log(
          `Copy trade executed: follower=${config.followerId.substring(0, 8)}..., ${tradeData.side} ${copiedQty.toFixed(8)} ${tradeData.symbol} @ ${price.toFixed(8)}`,
        );
      } catch (error: any) {
        // 개별 카피 트레이딩 실패가 다른 팔로워에 영향을 주지 않도록 격리
        // Isolate individual copy trade failures to prevent affecting other followers
        this.logger.warn(
          `Copy trade execution failed: follower=${config.followerId.substring(0, 8)}..., trader=${traderId.substring(0, 8)}..., symbol=${tradeData.symbol}, reason=${error?.message}`,
        );
        this.logger.error(
          `Unexpected error processing copy trade for follower ${config.followerId.substring(0, 8)}...: ${error?.message}`,
        );
      }
    }));
  }

  /**
   * 순환 참조 탐지 — BFS로 startUserId에서 시작하여 targetUserId에 도달 가능한지 확인합니다.
   * startUserId가 (직접 또는 간접적으로) targetUserId를 카피하고 있다면 순환이 발생합니다.
   *
   * Cycle detection — BFS from startUserId to check if targetUserId is reachable.
   * If startUserId copies targetUserId (directly or transitively), enabling the reverse would create a cycle.
   *
   * @param startUserId 탐색 시작점 (트레이더) / BFS start node (trader)
   * @param targetUserId 도달 여부를 확인할 대상 (팔로워) / Target to check reachability for (follower)
   * @param maxDepth 최대 탐색 깊이 / Maximum traversal depth
   */
  private async detectCopyCycle(
    startUserId: string,
    targetUserId: string,
    maxDepth: number,
  ): Promise<boolean> {
    // 재귀 CTE로 단일 쿼리에서 순환 탐지 — depth별 순차 쿼리 제거
    // Single recursive CTE query for cycle detection — eliminates per-depth sequential queries
    const result = await this.prisma.$queryRaw<{ found: boolean }[]>`
      WITH RECURSIVE copy_chain AS (
        SELECT "trader_id"::uuid AS user_id, 1 AS depth
        FROM "copy_trade_configs"
        WHERE "follower_id" = ${startUserId}::uuid AND "is_active" = true
        UNION ALL
        SELECT c."trader_id"::uuid, cc.depth + 1
        FROM "copy_trade_configs" c
        JOIN copy_chain cc ON c."follower_id" = cc.user_id
        WHERE c."is_active" = true AND cc.depth < ${maxDepth}
      )
      SELECT EXISTS(
        SELECT 1 FROM copy_chain WHERE user_id = ${targetUserId}::uuid
      ) AS found
    `;
    return result[0]?.found ?? false;
  }

  /**
   * 설정 데이터를 응답 형식으로 변환합니다.
   * Convert config data to response format.
   */
  private toConfigResponse(config: {
    id: string;
    followerId: string;
    traderId: string;
    isActive: boolean;
    scaleRatio: any;
    maxInvestment: any;
    stopLossPercent: any;
    totalInvested: any;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: config.id,
      followerId: config.followerId,
      traderId: config.traderId,
      isActive: config.isActive,
      scaleRatio: config.scaleRatio.toString(),
      maxInvestment: config.maxInvestment.toString(),
      stopLossPercent: config.stopLossPercent?.toString() ?? null,
      totalInvested: config.totalInvested.toString(),
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * 실행 기록 데이터를 응답 형식으로 변환합니다.
   * Convert execution data to response format.
   */
  private toExecutionResponse(execution: {
    id: string;
    configId: string;
    followerId: string;
    traderId: string;
    originalTradeId: string;
    copiedOrderId: string | null;
    symbol: string;
    side: string;
    originalQty: any;
    copiedQty: any;
    price: any;
    status: string;
    failReason: string | null;
    createdAt: Date;
  }) {
    return {
      id: execution.id,
      configId: execution.configId,
      followerId: execution.followerId,
      traderId: execution.traderId,
      originalTradeId: execution.originalTradeId,
      copiedOrderId: execution.copiedOrderId,
      symbol: execution.symbol,
      side: execution.side,
      originalQty: execution.originalQty.toString(),
      copiedQty: execution.copiedQty.toString(),
      price: execution.price.toString(),
      status: execution.status,
      failReason: execution.failReason,
      createdAt: execution.createdAt,
    };
  }
}
