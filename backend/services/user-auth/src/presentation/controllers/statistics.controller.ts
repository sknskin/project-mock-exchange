/**
 * @file 통계 컨트롤러
 * @description 페이지 방문, 로그인, 회원가입, 공지사항 통계
 *
 * @file Statistics Controller
 * @description Page view, login, registration, announcement statistics
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../infrastructure/config/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/config/current-user.decorator';
import { UserDto, USER_ROLE } from '@mock-exchange/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly prisma: PrismaService) {}

  // Public endpoint: track page view
  @Post('page-view')
  async trackPageView(@Body() body: { path: string; userId?: string }) {
    await this.prisma.pageView.create({
      data: { path: body.path, userId: body.userId || null },
    });
    return { success: true };
  }

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  async overview(@CurrentUser() user: UserDto) {
    this.assertAdmin(user);

    const [totalUsers, activeUsers, pendingUsers, totalAnnouncements, totalPageViews, todayLogins] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true, approvalStatus: 'APPROVED' } }),
        this.prisma.user.count({ where: { approvalStatus: { not: 'APPROVED' } } }),
        this.prisma.announcement.count(),
        this.prisma.pageView.count(),
        this.prisma.loginLog.count({
          where: { createdAt: { gte: startOfDay() } },
        }),
      ]);

    return {
      success: true,
      data: {
        totalUsers,
        activeUsers,
        pendingUsers,
        totalAnnouncements,
        totalPageViews,
        todayLogins,
      },
    };
  }

  @Get('registrations')
  @UseGuards(JwtAuthGuard)
  async registrationStats(
    @CurrentUser() user: UserDto,
    @Query('period') period: string = 'daily',
    @Query('days') days: string = '30',
  ) {
    this.assertAdmin(user);
    const daysNum = parseInt(days) || 30;
    const since = new Date(Date.now() - daysNum * 86400000);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, role: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = groupByPeriod(
      users.map((u) => ({ date: u.createdAt, value: 1 })),
      period,
    );

    return { success: true, data: grouped };
  }

  @Get('logins')
  @UseGuards(JwtAuthGuard)
  async loginStats(
    @CurrentUser() user: UserDto,
    @Query('period') period: string = 'daily',
    @Query('days') days: string = '30',
  ) {
    this.assertAdmin(user);
    const daysNum = parseInt(days) || 30;
    const since = new Date(Date.now() - daysNum * 86400000);

    const logs = await this.prisma.loginLog.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = groupByPeriod(
      logs.map((l) => ({ date: l.createdAt, value: 1 })),
      period,
    );

    return { success: true, data: grouped };
  }

  @Get('page-views')
  @UseGuards(JwtAuthGuard)
  async pageViewStats(
    @CurrentUser() user: UserDto,
    @Query('period') period: string = 'daily',
    @Query('days') days: string = '30',
  ) {
    this.assertAdmin(user);
    const daysNum = parseInt(days) || 30;
    const since = new Date(Date.now() - daysNum * 86400000);

    const views = await this.prisma.pageView.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, path: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = groupByPeriod(
      views.map((v) => ({ date: v.createdAt, value: 1 })),
      period,
    );

    // Top pages
    const pathCounts: Record<string, number> = {};
    views.forEach((v) => {
      pathCounts[v.path] = (pathCounts[v.path] || 0) + 1;
    });
    const topPages = Object.entries(pathCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    return { success: true, data: { timeline: grouped, topPages } };
  }

  @Get('announcements')
  @UseGuards(JwtAuthGuard)
  async announcementStats(
    @CurrentUser() user: UserDto,
    @Query('days') days: string = '30',
  ) {
    this.assertAdmin(user);
    const daysNum = parseInt(days) || 30;
    const since = new Date(Date.now() - daysNum * 86400000);

    const [announcements, comments] = await Promise.all([
      this.prisma.announcement.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.comment.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const announcementTimeline = groupByPeriod(
      announcements.map((a) => ({ date: a.createdAt, value: 1 })),
      'daily',
    );
    const commentTimeline = groupByPeriod(
      comments.map((c) => ({ date: c.createdAt, value: 1 })),
      'daily',
    );

    return {
      success: true,
      data: {
        announcements: announcementTimeline,
        comments: commentTimeline,
        totalAnnouncements: announcements.length,
        totalComments: comments.length,
      },
    };
  }

  @Get('overview-trend')
  @UseGuards(JwtAuthGuard)
  async overviewTrend(@CurrentUser() user: UserDto) {
    this.assertAdmin(user);

    const todayStart = startOfDay();
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);

    const [todayUsers, yesterdayUsers, todayLogins, yesterdayLogins, todayViews, yesterdayViews, todayAnnouncements, yesterdayAnnouncements] =
      await Promise.all([
        this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
        this.prisma.user.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
        this.prisma.loginLog.count({ where: { createdAt: { gte: todayStart } } }),
        this.prisma.loginLog.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
        this.prisma.pageView.count({ where: { createdAt: { gte: todayStart } } }),
        this.prisma.pageView.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
        this.prisma.announcement.count({ where: { createdAt: { gte: todayStart } } }),
        this.prisma.announcement.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      ]);

    const calcChange = (today: number, yesterday: number) => {
      if (yesterday === 0) return today > 0 ? 100 : 0;
      return Math.round(((today - yesterday) / yesterday) * 100);
    };

    return {
      success: true,
      data: {
        newUsers: { today: todayUsers, yesterday: yesterdayUsers, changePercent: calcChange(todayUsers, yesterdayUsers) },
        logins: { today: todayLogins, yesterday: yesterdayLogins, changePercent: calcChange(todayLogins, yesterdayLogins) },
        pageViews: { today: todayViews, yesterday: yesterdayViews, changePercent: calcChange(todayViews, yesterdayViews) },
        announcements: { today: todayAnnouncements, yesterday: yesterdayAnnouncements, changePercent: calcChange(todayAnnouncements, yesterdayAnnouncements) },
      },
    };
  }

  @Get('popular-announcements')
  @UseGuards(JwtAuthGuard)
  async popularAnnouncements(@CurrentUser() user: UserDto) {
    this.assertAdmin(user);

    const announcements = await this.prisma.announcement.findMany({
      select: {
        id: true,
        title: true,
        _count: { select: { comments: true } },
      },
      orderBy: { comments: { _count: 'desc' } },
      take: 5,
    });

    return {
      success: true,
      data: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        commentCount: a._count.comments,
      })),
    };
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  async userStats(@CurrentUser() user: UserDto) {
    this.assertAdmin(user);

    const [byRole, byStatus] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      this.prisma.user.groupBy({
        by: ['approvalStatus', 'isActive'],
        _count: true,
      }),
    ]);

    return {
      success: true,
      data: {
        byRole: byRole.map((r) => ({ role: r.role, count: r._count })),
        byStatus: byStatus.map((s) => ({
          approvalStatus: s.approvalStatus,
          isActive: s.isActive,
          count: s._count,
        })),
      },
    };
  }

  private assertAdmin(user: UserDto) {
    if (user.role !== USER_ROLE.SYSTEM && user.role !== USER_ROLE.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
  }
}

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function groupByPeriod(
  items: Array<{ date: Date; value: number }>,
  period: string,
): Array<{ label: string; count: number }> {
  const map: Record<string, number> = {};

  items.forEach((item) => {
    const d = new Date(item.date);
    let key: string;
    if (period === 'hourly') {
      key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00`;
    } else if (period === 'weekly') {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = `${weekStart.getFullYear()}-${pad(weekStart.getMonth() + 1)}-${pad(weekStart.getDate())}`;
    } else if (period === 'monthly') {
      key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    } else if (period === 'yearly') {
      key = `${d.getFullYear()}`;
    } else {
      key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    map[key] = (map[key] || 0) + item.value;
  });

  return Object.entries(map).map(([label, count]) => ({ label, count }));
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
