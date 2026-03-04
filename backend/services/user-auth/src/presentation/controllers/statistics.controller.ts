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
import { IsString, IsOptional, MaxLength, Matches, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../infrastructure/config/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/config/current-user.decorator';
import { UserDto, USER_ROLE } from '@virtuex/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

// 페이지 뷰 추적 DTO — 정규식으로 URL 인젝션 방지 / Page view tracking DTO — regex prevents URL injection
class TrackPageViewDto {
  @IsString()
  @MaxLength(500)
  @Matches(/^\/[a-zA-Z0-9\-_\/\.\?\&\=\%\#]*$/, { message: 'Invalid path format' })
  path: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

// 기간 조회 쿼리 DTO — 최대 365일 제한으로 과도한 조회 방지 / Period query DTO — max 365 days to prevent excessive queries
class PeriodQueryDto {
  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}

@UseGuards(InternalAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly prisma: PrismaService) {}

  // Public endpoint: track page view
  @Post('page-view')
  async trackPageView(@Body() body: TrackPageViewDto) {
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
    @Query() query: PeriodQueryDto,
  ) {
    this.assertAdmin(user);
    const period = query.period || 'daily';
    const daysNum = Math.min(query.days || 30, 365);
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

  @Get('registrations-approved')
  @UseGuards(JwtAuthGuard)
  async approvedRegistrationStats(
    @CurrentUser() user: UserDto,
    @Query() query: PeriodQueryDto,
  ) {
    this.assertAdmin(user);
    const period = query.period || 'daily';
    const daysNum = Math.min(query.days || 30, 365);
    const since = new Date(Date.now() - daysNum * 86400000);

    const users = await this.prisma.user.findMany({
      where: {
        approvalStatus: 'APPROVED',
        approvedAt: { gte: since },
      },
      select: { approvedAt: true },
      orderBy: { approvedAt: 'asc' },
    });

    const grouped = groupByPeriod(
      users
        .filter((u) => u.approvedAt !== null)
        .map((u) => ({ date: u.approvedAt!, value: 1 })),
      period,
    );

    return { success: true, data: grouped };
  }

  @Get('logins')
  @UseGuards(JwtAuthGuard)
  async loginStats(
    @CurrentUser() user: UserDto,
    @Query() query: PeriodQueryDto,
  ) {
    this.assertAdmin(user);
    const period = query.period || 'daily';
    const daysNum = Math.min(query.days || 30, 365);
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
    @Query() query: PeriodQueryDto,
  ) {
    this.assertAdmin(user);
    const period = query.period || 'daily';
    const daysNum = Math.min(query.days || 30, 365);
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
    @Query() query: PeriodQueryDto,
  ) {
    this.assertAdmin(user);
    const daysNum = Math.min(query.days || 30, 365);
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

  // 인기 공지사항 Top 10 (댓글 수 기준)
  @Get('popular-announcements')
  @UseGuards(JwtAuthGuard)
  async popularAnnouncements(@CurrentUser() user: UserDto) {
    this.assertAdmin(user);

    const announcements = await this.prisma.announcement.findMany({
      select: {
        id: true,
        title: true,
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { comments: { _count: 'desc' } },
      take: 10,
    });

    return {
      success: true,
      data: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        commentCount: a._count.comments,
        likeCount: a._count.likes,
      })),
    };
  }

  // 좋아요 통계 (공지사항 좋아요, 댓글 좋아요 타임라인 + 합계)
  @Get('likes')
  @UseGuards(JwtAuthGuard)
  async likeStats(
    @CurrentUser() user: UserDto,
    @Query() query: PeriodQueryDto,
  ) {
    this.assertAdmin(user);
    const daysNum = Math.min(query.days || 30, 365);
    const since = new Date(Date.now() - daysNum * 86400000);

    const [announcementLikes, commentLikes] = await Promise.all([
      this.prisma.announcementLike.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.commentLike.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const announcementLikeTimeline = groupByPeriod(
      announcementLikes.map((l) => ({ date: l.createdAt, value: 1 })),
      'daily',
    );
    const commentLikeTimeline = groupByPeriod(
      commentLikes.map((l) => ({ date: l.createdAt, value: 1 })),
      'daily',
    );

    // 좋아요가 가장 많은 공지사항 Top 10
    const topLikedAnnouncements = await this.prisma.announcement.findMany({
      select: {
        id: true,
        title: true,
        _count: { select: { likes: true } },
      },
      orderBy: { likes: { _count: 'desc' } },
      take: 10,
    });

    return {
      success: true,
      data: {
        announcementLikes: announcementLikeTimeline,
        commentLikes: commentLikeTimeline,
        totalAnnouncementLikes: announcementLikes.length,
        totalCommentLikes: commentLikes.length,
        topLikedAnnouncements: topLikedAnnouncements.map((a) => ({
          id: a.id,
          title: a.title,
          likeCount: a._count.likes,
        })),
      },
    };
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  async userStats(@CurrentUser() user: UserDto) {
    this.assertAdmin(user);

    const [byRole, byStatus] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role'],
        where: { approvalStatus: 'APPROVED' },
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

// 오늘 0시 0분 0초를 반환하는 유틸리티 함수 / Utility function returning today's midnight
function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 날짜별 데이터를 지정된 기간(시간별/일별/주별/월별/연별)으로 그룹화합니다
 * Aggregates date-based data by the specified period (hourly/daily/weekly/monthly/yearly)
 */
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
