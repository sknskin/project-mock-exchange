import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../infrastructure/config/jwt-auth.guard';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Controller('users')
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

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
