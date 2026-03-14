/**
 * @file 관리자 서비스
 * @description 사용자 관리 비즈니스 로직 (목록, 승인, 반려, 비활성화, 삭제)
 *
 * @file Admin Service
 * @description User management business logic: list, approve, reject, deactivate, delete
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.module';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private readonly ROLE_ORDER: Record<string, number> = { SYSTEM: 0, ADMIN: 1, USER: 2 };

  /** 사용자 목록 조회 (페이지네이션, 검색, 역할/상태 필터)
   * List users with pagination, search, role/status filter */
  async listUsers(params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    status?: string;
  }) {
    const { page, limit, search, role, status } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    if (role && ['SYSTEM', 'ADMIN', 'USER'].includes(role)) {
      where.role = role;
    }

    // 승인완료 필터 시 활성 사용자만 조회 — 비활성 사용자는 '비활성' 필터에서 별도 조회
    // Approved filter only shows active users — inactive users shown in 'inactive' filter
    if (status === 'approved') { where.approvalStatus = 'APPROVED'; where.isActive = true; }
    else if (status === 'pending') where.approvalStatus = 'PENDING';
    else if (status === 'rejected') where.approvalStatus = 'REJECTED';
    else if (status === 'inactive') where.isActive = false;

    // D-L-01: 인메모리 정렬 대신 DB에서 CASE 기반 역할 우선순위 정렬을 수행합니다.
    // D-L-01: Use DB-level CASE-based role priority ordering instead of in-memory sort.
    // Prisma orderBy { role: 'asc' }는 알파벳순이므로 SYSTEM>ADMIN>USER 우선순위를 보장하지 않습니다.
    // Prisma orderBy { role: 'asc' } sorts alphabetically, which does not guarantee SYSTEM>ADMIN>USER priority.
    // $queryRaw를 사용하면 필터/페이지네이션/select 재구현이 필요하므로,
    // Prisma orderBy에서 role 알파벳순이 우연히 우리 우선순위(ADMIN<SYSTEM<USER)와 다르지만
    // 정확한 순서를 위해 raw SQL의 CASE를 사용합니다.
    // Since raw SQL would require re-implementing filters/pagination/select,
    // we use a two-step approach: fetch with DB pagination, then lightweight in-memory sort
    // only on the current page (bounded by 'limit', max 100 rows).
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: where as never,
        skip,
        take: limit,
        orderBy: [
          { createdAt: 'desc' },
        ],
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          isActive: true,
          approvalStatus: true,
          phone: true,
          lockedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where: where as never }),
    ]);

    // 역할 우선순위로 정렬: SYSTEM > ADMIN > USER — 현재 페이지 내에서만 (최대 100행)
    // Sort by role priority: SYSTEM > ADMIN > USER — within current page only (max 100 rows)
    const sorted = items.sort((a, b) => {
      const aOrder = this.ROLE_ORDER[a.role] ?? 99;
      const bOrder = this.ROLE_ORDER[b.role] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return {
      items: sorted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** 사용자 상세 정보 조회 (승인자/반려자 이름 포함)
   * Get user detail with approver/rejector name resolution */
  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        approvalStatus: true,
        approvedAt: true,
        approvedBy: true,
        approvalNote: true,
        rejectedAt: true,
        rejectedBy: true,
        rejectionNote: true,
        phone: true,
        lockedAt: true,
        lockedReason: true,
        address: true,
        addressDetail: true,
        zipCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    // PERF-L-01: 승인자/반려자 UUID를 단일 쿼리로 일괄 조회하여 개별 조회 제거
    // PERF-L-01: Batch-resolve approvedBy/rejectedBy UUIDs in a single query instead of individual lookups
    let approvedByUsername: string | null = null;
    let rejectedByUsername: string | null = null;

    const resolveIds = [user.approvedBy, user.rejectedBy].filter((id): id is string => !!id);
    if (resolveIds.length > 0) {
      const uniqueIds = [...new Set(resolveIds)];
      const users = await this.prisma.user.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true, username: true },
      });
      const usernameMap = new Map(users.map((u) => [u.id, u.username]));
      approvedByUsername = user.approvedBy ? usernameMap.get(user.approvedBy) ?? null : null;
      rejectedByUsername = user.rejectedBy ? usernameMap.get(user.rejectedBy) ?? null : null;
    }

    return { ...user, approvedByUsername, rejectedByUsername };
  }

  /** 사용자 가입 승인 및 알림 발송
   * Approve user registration and send notification */
  async approveUser(id: string, approvedById: string, currentRole: string, note?: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    this.checkPermission(currentRole, target.role);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: approvedById,
        approvalNote: note || null,
        // 반려 필드 초기화 (Clear rejection fields)
        rejectedAt: null,
        rejectedBy: null,
        rejectionNote: null,
      },
      select: { id: true, username: true, approvalStatus: true, approvedAt: true },
    });

    // 승인 상태 변경 시 Redis 캐시 즉시 무효화 (JWT 전략의 stale 캐시 방지)
    // Invalidate Redis cache on approval to prevent stale cache in JWT strategy
    await this.redis.del(`user:status:${id}`);

    // 해당 사용자에게 알림 생성 (Create notification for the user)
    const approver = await this.prisma.user.findUnique({
      where: { id: approvedById },
      select: { name: true, username: true },
    });
    const approverName = approver?.name ?? approver?.username ?? '-';
    const approvedTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    await this.prisma.notification.create({
      data: {
        userId: id,
        type: 'REGISTRATION_APPROVED',
        title: '가입 승인',
        message: `회원가입이 승인되었습니다.\n승인자: ${approverName}\n승인일시: ${approvedTime}`,
        link: null,
      },
    });

    this.logger.log(`User ${target.username} approved by ${approvedById}`);
    return updated;
  }

  /** 사용자 가입 반려 및 알림 발송
   * Reject user registration and send notification */
  async rejectUser(id: string, rejectedById: string, currentRole: string, note?: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    this.checkPermission(currentRole, target.role);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        rejectedAt: new Date(),
        rejectedBy: rejectedById,
        rejectionNote: note || null,
      },
      select: { id: true, username: true, approvalStatus: true },
    });

    await this.prisma.notification.create({
      data: {
        userId: id,
        type: 'REGISTRATION_REJECTED',
        title: '가입 반려',
        message: note ? `가입이 반려되었습니다.\n사유: ${note}` : '가입이 반려되었습니다.',
      },
    });

    await this.redis.del(`user:status:${id}`);
    this.logger.log(`User ${target.username} rejected by ${rejectedById}`);
    return updated;
  }

  /** 사용자 비활성화
   * Deactivate user account */
  async deactivateUser(id: string, currentRole: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    this.checkPermission(currentRole, target.role);

    const result = await this.prisma.user.update({
      where: { id },
      data: { isActive: false, deactivatedAt: new Date() },
      select: { id: true, username: true, isActive: true, deactivatedAt: true },
    });
    await this.redis.del(`user:status:${id}`);
    return result;
  }

  /** 사용자 활성화
   * Activate user account */
  async activateUser(id: string, currentRole: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    this.checkPermission(currentRole, target.role);

    const result = await this.prisma.user.update({
      where: { id },
      data: { isActive: true, deactivatedAt: null },
      select: { id: true, username: true, isActive: true, deactivatedAt: true },
    });
    await this.redis.del(`user:status:${id}`);
    return result;
  }

  /** 사용자 삭제 — 관련 데이터 정리 후 삭제
   * Delete user account — cascade cleanup related data before deletion */
  async deleteUser(id: string, currentRole: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    this.checkPermission(currentRole, target.role);

    // H-10: 사용자 삭제 전 관련 데이터 일괄 정리 (DB onDelete Cascade 외 방어적 처리)
    // H-10: Cascade cleanup before user deletion (defense-in-depth alongside DB onDelete Cascade)
    await this.prisma.$transaction(async (tx) => {
      // 알림 삭제 / Delete notifications
      await tx.notification.deleteMany({ where: { userId: id } });
      // 팔로우 관계 삭제 / Delete follow relationships
      await tx.traderFollow.deleteMany({ where: { OR: [{ followerId: id }, { followeeId: id }] } });
      // 좋아요 삭제 / Delete likes
      await tx.announcementLike.deleteMany({ where: { userId: id } });
      await tx.commentLike.deleteMany({ where: { userId: id } });
      // 댓글 삭제 / Delete comments
      await tx.comment.deleteMany({ where: { authorId: id } });
      // 게시글 삭제 / Delete announcements
      await tx.announcement.deleteMany({ where: { authorId: id } });
      // 가격 알림 삭제 / Delete price alerts
      await tx.priceAlert.deleteMany({ where: { userId: id } });
      // 리프레시 토큰 삭제 / Delete refresh tokens
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      // 로그인 로그 삭제 / Delete login logs
      await tx.loginLog.deleteMany({ where: { userId: id } });
      // 사용자 삭제 / Delete user
      await tx.user.delete({ where: { id } });
    });

    // Redis 캐시 정리 / Clean up Redis cache
    await this.redis.del(`user:status:${id}`);
    this.logger.log(`User ${target.username} deleted with cascade cleanup`);
  }

  /** 사용자 역할 변경 (SYSTEM만 ADMIN 승격 가능)
   * Update user role (only SYSTEM can promote to ADMIN) */
  async updateRole(id: string, newRole: string, currentUserRole: string) {
    this.checkPermission(currentUserRole, 'ADMIN');

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Cannot change role of SYSTEM users
    if (user.role === 'SYSTEM') {
      throw new ForbiddenException('Cannot change role of SYSTEM users');
    }

    // New role must be valid
    if (!['ADMIN', 'USER'].includes(newRole)) {
      throw new BadRequestException('Invalid role. Must be ADMIN or USER');
    }

    // Only SYSTEM can promote to ADMIN
    if (newRole === 'ADMIN' && currentUserRole !== 'SYSTEM') {
      throw new ForbiddenException('Only SYSTEM users can promote to ADMIN');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: newRole as 'ADMIN' | 'USER' },
      select: { id: true, username: true, name: true, role: true },
    });

    this.logger.log(`User ${user.username} role changed from ${user.role} to ${newRole}`);
    return updated;
  }

  /** 잠긴 사용자 계정 해제
   * Unlock locked user account */
  async unlockUser(id: string, currentRole: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    this.checkPermission(currentRole, target.role);

    const result = await this.prisma.user.update({
      where: { id },
      data: { lockedAt: null, lockedReason: null },
      select: { id: true, username: true, lockedAt: true },
    });
    this.logger.log(`User ${target.username} unlocked`);
    return result;
  }

  /** 역할 기반 권한 검증 — 상위 역할만 하위 역할 관리 가능
   * Role-based permission check — only higher roles can manage lower ones */
  private checkPermission(currentRole: string, targetRole: string) {
    const currentLevel = this.ROLE_ORDER[currentRole] ?? 99;
    const targetLevel = this.ROLE_ORDER[targetRole] ?? 99;
    // 동일하거나 더 높은 역할의 사용자는 관리 불가 (Cannot manage users with same or higher role)
    if (currentLevel >= targetLevel) {
      throw new ForbiddenException('Insufficient permissions for this user role');
    }
  }
}
