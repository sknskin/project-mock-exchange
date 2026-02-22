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
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  private readonly ROLE_ORDER: Record<string, number> = { SYSTEM: 0, ADMIN: 1, USER: 2 };

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

    if (status === 'approved') where.approvalStatus = 'APPROVED';
    else if (status === 'pending') where.approvalStatus = 'PENDING';
    else if (status === 'rejected') where.approvalStatus = 'REJECTED';
    else if (status === 'inactive') where.isActive = false;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: where as never,
        skip,
        take: limit,
        orderBy: [
          { role: 'asc' },
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
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where: where as never }),
    ]);

    // Sort by role priority: SYSTEM > ADMIN > USER
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
        address: true,
        addressDetail: true,
        zipCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    // Resolve approvedBy UUID to username
    let approvedByUsername: string | null = null;
    if (user.approvedBy) {
      const approver = await this.prisma.user.findUnique({
        where: { id: user.approvedBy },
        select: { username: true },
      });
      approvedByUsername = approver?.username ?? null;
    }

    // Resolve rejectedBy UUID to username
    let rejectedByUsername: string | null = null;
    if (user.rejectedBy) {
      const rejector = await this.prisma.user.findUnique({
        where: { id: user.rejectedBy },
        select: { username: true },
      });
      rejectedByUsername = rejector?.username ?? null;
    }

    return { ...user, approvedByUsername, rejectedByUsername };
  }

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
        // Clear rejection fields
        rejectedAt: null,
        rejectedBy: null,
        rejectionNote: null,
      },
      select: { id: true, username: true, approvalStatus: true, approvedAt: true },
    });

    // Create notification for the user
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

    this.logger.log(`User ${target.username} rejected by ${rejectedById}`);
    return updated;
  }

  async deactivateUser(id: string, currentRole: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    this.checkPermission(currentRole, target.role);

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, username: true, isActive: true },
    });
  }

  async activateUser(id: string, currentRole: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    this.checkPermission(currentRole, target.role);

    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: { id: true, username: true, isActive: true },
    });
  }

  async deleteUser(id: string, currentRole: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    this.checkPermission(currentRole, target.role);

    await this.prisma.user.delete({ where: { id } });
    this.logger.log(`User ${target.username} deleted`);
  }

  private checkPermission(currentRole: string, targetRole: string) {
    const currentLevel = this.ROLE_ORDER[currentRole] ?? 99;
    const targetLevel = this.ROLE_ORDER[targetRole] ?? 99;
    // Cannot manage users with same or higher role
    if (currentLevel >= targetLevel) {
      throw new ForbiddenException('Insufficient permissions for this user role');
    }
  }
}
