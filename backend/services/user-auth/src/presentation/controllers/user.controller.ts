/**
 * @file 사용자 조회 컨트롤러
 * @description 서비스 간 내부 사용자 조회 API (상태 확인, ID 일괄 조회, 검색)
 *
 * @file User Lookup Controller
 * @description Internal inter-service user lookup API (status check, batch by IDs, search)
 */
import { Controller, Get, Post, Param, Query, Body, NotFoundException, BadRequestException, UseGuards } from '@nestjs/common';
import { Public } from '../../infrastructure/config/jwt-auth.guard';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

// 내부 서비스 전용 — API Gateway의 x-internal-token으로만 접근 가능
// Internal service only — accessible only via API Gateway's x-internal-token
@UseGuards(InternalAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { isActive: true, approvalStatus: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { isActive: user.isActive, approvalStatus: user.approvalStatus };
  }

  @Public()
  @Post('by-ids')
  async getByIds(@Body() body: { ids: string[] }) {
    const ids = body.ids || [];
    if (ids.length === 0) return { success: true, data: [] };
    // 배열 크기 제한으로 대량 조회 방지 (Limit array size to prevent bulk enumeration)
    if (ids.length > 100) {
      throw new BadRequestException('Maximum 100 IDs allowed');
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, username: true, name: true },
    });

    return { success: true, data: users };
  }

  // 사용자 검색 — 채팅 초대 등에 사용, 활성/승인된 사용자만 반환 / User search — used for chat invites, returns only active/approved users
  @Public()
  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('excludeIds') excludeIds?: string,
  ) {
    const where: Record<string, unknown> = {
      isActive: true,
      approvalStatus: 'APPROVED',
    };

    if (q && q.trim().length > 0) {
      const trimmed = q.trim();
      where.OR = [
        { username: { contains: trimmed, mode: 'insensitive' } },
        { name: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    if (excludeIds) {
      const ids = excludeIds.split(',').filter(Boolean);
      if (ids.length > 0) {
        where.id = { notIn: ids };
      }
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
      },
      orderBy: { username: 'asc' },
      // 채팅 초대 시 전체 사용자 목록이 보이도록 충분히 큰 제한값 설정
      // Set large enough limit so all users are visible when inviting to chat
      take: 200,
    });

    return { success: true, data: users };
  }
}
