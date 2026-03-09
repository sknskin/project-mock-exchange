/**
 * @file 트레이더 활동 피드 서비스
 * @description 트레이더의 거래 활동 기록 및 소셜 피드 조회를 처리합니다
 *
 * @file Trader Activity Feed Service
 * @description Handles recording trader activities and retrieving social feeds
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

export interface RecordActivityData {
  userId: string;
  type: string;
  symbol: string;
  side: string;
  quantity: string;
  price: string;
  tradeId: string;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 트레이더 활동을 기록합니다.
   * Record a trader activity.
   */
  async recordActivity(data: RecordActivityData) {
    const activity = await this.prisma.traderActivity.create({
      data: {
        userId: data.userId,
        type: data.type,
        symbol: data.symbol,
        side: data.side,
        quantity: data.quantity,
        price: data.price,
        tradeId: data.tradeId,
      },
    });

    this.logger.log(
      `Recorded activity for user ${data.userId.substring(0, 8)}...: ${data.side} ${data.symbol}`,
    );

    return activity;
  }

  /**
   * 팔로잉 중인 트레이더들의 활동 피드를 조회합니다.
   * Get activity feed for followed traders.
   */
  async getFeed(followingIds: string[], page: number = 1, limit: number = 20) {
    if (followingIds.length === 0) {
      return { data: [], total: 0, page, limit };
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.traderActivity.findMany({
        where: {
          userId: { in: followingIds },
          isPublic: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.traderActivity.count({
        where: {
          userId: { in: followingIds },
          isPublic: true,
        },
      }),
    ]);

    return {
      data: activities.map((a) => this.toActivityResponse(a)),
      total,
      page,
      limit,
    };
  }

  /**
   * 특정 트레이더의 공개 활동을 조회합니다.
   * Get public activities for a specific trader.
   */
  async getUserActivities(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.traderActivity.findMany({
        where: {
          userId,
          isPublic: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.traderActivity.count({
        where: {
          userId,
          isPublic: true,
        },
      }),
    ]);

    return {
      data: activities.map((a) => this.toActivityResponse(a)),
      total,
      page,
      limit,
    };
  }

  /**
   * 트레이더 활동의 공개 여부를 변경합니다.
   * Update default visibility for a trader's activities.
   */
  async setVisibility(userId: string, isPublic: boolean) {
    const updated = await this.prisma.traderActivity.updateMany({
      where: { userId },
      data: { isPublic },
    });

    this.logger.log(
      `Updated visibility for user ${userId.substring(0, 8)}...: isPublic=${isPublic}, affected=${updated.count}`,
    );

    return { updated: updated.count, isPublic };
  }

  /**
   * 활동 데이터를 응답 형식으로 변환합니다.
   * Convert activity data to response format.
   */
  private toActivityResponse(activity: {
    id: string;
    userId: string;
    type: string;
    symbol: string;
    side: string;
    quantity: any;
    price: any;
    tradeId: string;
    isPublic: boolean;
    createdAt: Date;
  }) {
    return {
      id: activity.id,
      userId: activity.userId,
      type: activity.type,
      symbol: activity.symbol,
      side: activity.side,
      quantity: activity.quantity.toString(),
      price: activity.price.toString(),
      tradeId: activity.tradeId,
      isPublic: activity.isPublic,
      createdAt: activity.createdAt,
    };
  }
}
