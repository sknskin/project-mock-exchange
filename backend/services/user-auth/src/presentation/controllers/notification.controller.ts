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
    const skip = (page - 1) * limit;
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: user.id },
        skip,
        take: limit,
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
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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
}
