import { Controller, Get, Post, Param, Query, Body, NotFoundException, BadRequestException, UseGuards } from '@nestjs/common';
import { Public } from '../../infrastructure/config/jwt-auth.guard';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

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
      take: 20,
    });

    return { success: true, data: users };
  }
}
