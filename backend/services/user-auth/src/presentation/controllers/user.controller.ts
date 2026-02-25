import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { Public } from '../../infrastructure/config/jwt-auth.guard';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Controller('users')
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Post('by-ids')
  async getByIds(@Body() body: { ids: string[] }) {
    const ids = body.ids || [];
    if (ids.length === 0) return { success: true, data: [] };

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, username: true, name: true },
    });

    return { success: true, data: users };
  }

  @Public()
  @Get('search')
  async search(@Query('q') q: string) {
    const where: Record<string, unknown> = {
      isActive: true,
      approvalStatus: 'APPROVED',
    };

    if (q && q.trim().length > 0) {
      where.username = { contains: q.trim(), mode: 'insensitive' };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
      },
      take: 20,
      orderBy: { username: 'asc' },
    });

    return { success: true, data: users };
  }
}
