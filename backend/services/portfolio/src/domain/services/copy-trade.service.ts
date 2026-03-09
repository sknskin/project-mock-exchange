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

@Injectable()
export class CopyTradeService {
  private readonly logger = new Logger(CopyTradeService.name);
  private readonly orderEngineUrl: string;
  private readonly internalToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.orderEngineUrl = this.config.get<string>(
      'ORDER_ENGINE_URL',
      'http://localhost:3004',
    );
    this.internalToken = this.config.get<string>('INTERNAL_SERVICE_SECRET', '');
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

    // 기존 설정이 있는지 확인 / Check for existing config
    const existing = await this.prisma.copyTradeConfig.findUnique({
      where: { followerId_traderId: { followerId, traderId } },
    });

    if (existing && existing.isActive) {
      throw new BadRequestException('Copy trading is already active for this trader');
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

    this.logger.log(
      `Stopped copy trading: follower=${followerId.substring(0, 8)}..., trader=${traderId.substring(0, 8)}...`,
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

    for (const config of configs) {
      try {
        // 스케일링된 수량 계산 / Calculate scaled quantity
        const scaleRatio = new Decimal(config.scaleRatio.toString());
        const copiedQty = originalQty.mul(scaleRatio);
        const investmentAmount = copiedQty.mul(price);

        // 최대 투자 한도 확인 / Check max investment limit
        const totalInvested = new Decimal(config.totalInvested.toString());
        const maxInvestment = new Decimal(config.maxInvestment.toString());
        const remainingBudget = maxInvestment.minus(totalInvested);

        if (tradeData.side === 'BUY' && investmentAmount.gt(remainingBudget)) {
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
              failReason: `Max investment limit exceeded: invested=${totalInvested.toFixed(2)}, limit=${maxInvestment.toFixed(2)}, required=${investmentAmount.toFixed(2)}`,
            },
          });

          this.logger.warn(
            `Copy trade skipped for follower ${config.followerId.substring(0, 8)}...: max investment exceeded`,
          );
          continue;
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
              timeout: 5000,
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

          this.logger.error(
            `Copy trade order failed for follower ${config.followerId.substring(0, 8)}...: ${reason}`,
          );
          continue;
        }

        // 성공 시 실행 기록 생성 및 총 투자금 갱신
        // On success: create execution record and update total invested
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

        // 매수일 때만 총 투자금 갱신 / Update total invested only for buy trades
        if (tradeData.side === 'BUY') {
          await this.prisma.copyTradeConfig.update({
            where: { id: config.id },
            data: {
              totalInvested: totalInvested.plus(investmentAmount).toFixed(8),
            },
          });
        }

        this.logger.log(
          `Copy trade executed: follower=${config.followerId.substring(0, 8)}..., ${tradeData.side} ${copiedQty.toFixed(8)} ${tradeData.symbol} @ ${price.toFixed(8)}`,
        );
      } catch (error: any) {
        // 개별 카피 트레이딩 실패가 다른 팔로워에 영향을 주지 않도록 격리
        // Isolate individual copy trade failures to prevent affecting other followers
        this.logger.error(
          `Unexpected error processing copy trade for follower ${config.followerId.substring(0, 8)}...: ${error?.message}`,
        );
      }
    }
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
