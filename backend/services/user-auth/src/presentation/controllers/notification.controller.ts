/**
 * @file 알림 컨트롤러
 * @description 알림 목록, 읽음 처리, 전체 읽음 처리
 *
 * @file Notification Controller
 * @description Notification list, mark as read, mark all as read
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../infrastructure/config/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/config/current-user.decorator';
import { UserDto } from '@virtuex/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@UseGuards(InternalAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly prisma: PrismaService) {}

  /** Internal endpoint for service-to-service notification creation */
  @Post()
  async create(
    @Body() body: { userId: string; type?: string; title: string; message: string; link?: string },
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: body.userId,
        type: (body.type as any) || 'GENERAL',
        title: body.title,
        message: body.message,
        link: body.link,
      },
    });
    return { success: true, data: notification };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @CurrentUser() user: UserDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    // 페이지네이션 최대값 제한 — 메모리 소진 방지 / Cap pagination limit to prevent memory exhaustion
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (safePage - 1) * safeLimit;
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: user.id },
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId: user.id } }),
      this.prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        unreadCount,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  async unreadCount(@CurrentUser() user: UserDto) {
    const count = await this.prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });
    return { success: true, data: { count } };
  }

  @Post(':id/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
  ) {
    await this.prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true },
    });
    return { success: true };
  }

  @Post('read-all')
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@CurrentUser() user: UserDto) {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.prisma.notification.deleteMany({
      where: { id, userId: user.id },
    });
    return { success: true };
  }
}
