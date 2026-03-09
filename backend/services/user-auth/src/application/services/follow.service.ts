/**
 * @file 팔로우 서비스
 * @description 트레이더 팔로우/언팔로우 및 팔로우 목록 비즈니스 로직
 *
 * @file Follow Service
 * @description Trader follow/unfollow and follow list business logic
 */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class FollowService {
  private readonly logger = new Logger(FollowService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 트레이더 팔로우 (자기 자신은 팔로우 불가)
  // Follow a trader (cannot follow yourself)
  async follow(followerId: string, followeeId: string) {
    if (followerId === followeeId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // 팔로우 대상 사용자 존재 확인
    // Verify followee user exists
    const followee = await this.prisma.user.findUnique({
      where: { id: followeeId },
      select: { id: true },
    });
    if (!followee) {
      throw new NotFoundException('User not found');
    }

    // 이미 팔로우 중인지 확인
    // Check if already following
    const existing = await this.prisma.traderFollow.findUnique({
      where: { followerId_followeeId: { followerId, followeeId } },
    });
    if (existing) {
      throw new ConflictException('Already following this user');
    }

    const follow = await this.prisma.traderFollow.create({
      data: { followerId, followeeId },
    });

    this.logger.log(`User ${followerId} followed ${followeeId}`);
    return follow;
  }

  // 트레이더 언팔로우
  // Unfollow a trader
  async unfollow(followerId: string, followeeId: string) {
    const existing = await this.prisma.traderFollow.findUnique({
      where: { followerId_followeeId: { followerId, followeeId } },
    });
    if (!existing) {
      throw new NotFoundException('Follow relationship not found');
    }

    await this.prisma.traderFollow.delete({
      where: { id: existing.id },
    });

    this.logger.log(`User ${followerId} unfollowed ${followeeId}`);
  }

  // 내가 팔로우하는 사용자 목록 (페이지네이션)
  // List users I'm following (paginated)
  async getFollowing(userId: string, page: number, limit: number) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);

    const [items, total] = await Promise.all([
      this.prisma.traderFollow.findMany({
        where: { followerId: userId },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          followee: {
            select: { id: true, username: true, name: true },
          },
        },
      }),
      this.prisma.traderFollow.count({ where: { followerId: userId } }),
    ]);

    return {
      items: items.map((f) => ({
        id: f.id,
        followeeId: f.followeeId,
        username: f.followee.username,
        name: f.followee.name,
        notifyMode: f.notifyMode,
        createdAt: f.createdAt,
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // 특정 사용자의 팔로워 목록 (페이지네이션)
  // List followers of a user (paginated)
  async getFollowers(userId: string, page: number, limit: number) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);

    const [items, total] = await Promise.all([
      this.prisma.traderFollow.findMany({
        where: { followeeId: userId },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          follower: {
            select: { id: true, username: true, name: true },
          },
        },
      }),
      this.prisma.traderFollow.count({ where: { followeeId: userId } }),
    ]);

    return {
      items: items.map((f) => ({
        id: f.id,
        followerId: f.followerId,
        username: f.follower.username,
        name: f.follower.name,
        createdAt: f.createdAt,
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // 팔로잉/팔로워 수 조회
  // Get following and follower counts
  async getFollowCounts(userId: string) {
    const [followingCount, followerCount] = await Promise.all([
      this.prisma.traderFollow.count({ where: { followerId: userId } }),
      this.prisma.traderFollow.count({ where: { followeeId: userId } }),
    ]);

    return { followingCount, followerCount };
  }

  // 팔로우 여부 확인
  // Check if following
  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const existing = await this.prisma.traderFollow.findUnique({
      where: { followerId_followeeId: { followerId, followeeId } },
    });
    return !!existing;
  }

  // 알림 모드 변경
  // Update notification mode
  async updateNotifyMode(followerId: string, followeeId: string, mode: string) {
    const existing = await this.prisma.traderFollow.findUnique({
      where: { followerId_followeeId: { followerId, followeeId } },
    });
    if (!existing) {
      throw new NotFoundException('Follow relationship not found');
    }

    const updated = await this.prisma.traderFollow.update({
      where: { id: existing.id },
      data: { notifyMode: mode },
    });

    this.logger.log(`User ${followerId} updated notify mode for ${followeeId} to ${mode}`);
    return updated;
  }

  // 특정 사용자의 팔로워 ID 목록 (알림 팬아웃용)
  // Get follower IDs for a user (for notification fan-out)
  async getFollowerIds(userId: string): Promise<string[]> {
    const followers = await this.prisma.traderFollow.findMany({
      where: { followeeId: userId },
      select: { followerId: true },
    });

    return followers.map((f) => f.followerId);
  }
}
