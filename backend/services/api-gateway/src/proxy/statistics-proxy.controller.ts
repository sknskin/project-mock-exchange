/**
 * @file 통계 프록시 컨트롤러
 * @description API Gateway에서 User Auth 서비스의 통계 API로 프록시
 *
 * @file Statistics Proxy Controller
 * @description Proxies statistics API requests to User Auth service
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRolesGuard } from '../auth/admin-roles.guard';

@ApiTags('Statistics')
@Controller('api/statistics')
export class StatisticsProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly configService: ConfigService,
  ) {}

  /** 페이지 뷰 기록을 user-auth 통계 API로 프록시
   * Proxy page view tracking to user-auth statistics API */
  // Public endpoint for page view tracking
  @Post('page-view')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  @ApiOperation({ summary: '페이지 뷰 기록', description: '페이지 방문을 기록합니다. 인증 불필요.' })
  @ApiResponse({ status: 201, description: '페이지 뷰 기록 성공' })
  async trackPageView(@Body() body: unknown, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/statistics/page-view',
      data: body,
      headers: {
        'x-internal-token': this.configService.get('INTERNAL_SERVICE_SECRET'),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /** 통계 개요 조회를 user-auth로 프록시
   * Proxy statistics overview to user-auth */
  @Get('overview')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '통계 개요 조회', description: '전체 통계 개요 데이터를 조회합니다.' })
  @ApiResponse({ status: 200, description: '통계 개요 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async overview(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/overview',
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 가입 통계 조회를 user-auth로 프록시
   * Proxy registration statistics to user-auth */
  @Get('registrations')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '가입 통계 조회', description: '기간별 사용자 가입 통계를 조회합니다.' })
  @ApiQuery({ name: 'from', required: false, description: '시작 날짜' })
  @ApiQuery({ name: 'to', required: false, description: '종료 날짜' })
  @ApiResponse({ status: 200, description: '가입 통계 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async registrations(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/registrations',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 승인 완료 가입 통계 조회를 user-auth로 프록시
   * Proxy approved registration statistics to user-auth */
  @Get('registrations-approved')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '승인 완료 가입 통계 조회', description: '기간별 승인 완료된 가입 통계를 조회합니다.' })
  @ApiQuery({ name: 'period', required: false, description: '집계 주기' })
  @ApiQuery({ name: 'days', required: false, description: '조회 기간(일)' })
  @ApiResponse({ status: 200, description: '승인 가입 통계 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async registrationsApproved(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/registrations-approved',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 반려/비활성화 통계 조회를 user-auth로 프록시
   * Proxy rejected/deactivated statistics to user-auth */
  @Get('registrations-rejected')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '반려/비활성화 통계 조회', description: '기간별 반려 및 비활성화된 회원 통계를 조회합니다.' })
  @ApiQuery({ name: 'period', required: false, description: '집계 주기' })
  @ApiQuery({ name: 'days', required: false, description: '조회 기간(일)' })
  @ApiResponse({ status: 200, description: '반려/비활성화 통계 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async registrationsRejected(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/registrations-rejected',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 로그인 통계 조회를 user-auth로 프록시
   * Proxy login statistics to user-auth */
  @Get('logins')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그인 통계 조회', description: '기간별 로그인 통계를 조회합니다.' })
  @ApiQuery({ name: 'from', required: false, description: '시작 날짜' })
  @ApiQuery({ name: 'to', required: false, description: '종료 날짜' })
  @ApiResponse({ status: 200, description: '로그인 통계 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async logins(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/logins',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 페이지 뷰 통계 조회를 user-auth로 프록시
   * Proxy page view statistics to user-auth */
  @Get('page-views')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '페이지 뷰 통계 조회', description: '기간별 페이지 뷰 통계를 조회합니다.' })
  @ApiQuery({ name: 'from', required: false, description: '시작 날짜' })
  @ApiQuery({ name: 'to', required: false, description: '종료 날짜' })
  @ApiResponse({ status: 200, description: '페이지 뷰 통계 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async pageViews(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/page-views',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 공지사항 통계 조회를 user-auth로 프록시
   * Proxy announcement statistics to user-auth */
  @Get('announcements')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '공지사항 통계 조회', description: '기간별 공지사항 통계를 조회합니다.' })
  @ApiQuery({ name: 'from', required: false, description: '시작 날짜' })
  @ApiQuery({ name: 'to', required: false, description: '종료 날짜' })
  @ApiResponse({ status: 200, description: '공지사항 통계 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async announcements(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/announcements',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 통계 개요 트렌드 조회를 user-auth로 프록시
   * Proxy statistics overview trend to user-auth */
  @Get('overview-trend')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '통계 개요 트렌드 조회', description: '통계 개요의 시간별 트렌드 데이터를 조회합니다.' })
  @ApiResponse({ status: 200, description: '통계 개요 트렌드 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async overviewTrend(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/overview-trend',
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 인기 공지사항 조회를 user-auth로 프록시
   * Proxy popular announcements to user-auth */
  @Get('popular-announcements')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '인기 공지사항 조회', description: '가장 많이 조회된 인기 공지사항 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '인기 공지사항 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async popularAnnouncements(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/popular-announcements',
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 사용자 통계 조회를 user-auth로 프록시
   * Proxy user statistics to user-auth */
  @Get('users')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '사용자 통계 조회', description: '사용자 관련 통계 데이터를 조회합니다.' })
  @ApiResponse({ status: 200, description: '사용자 통계 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async users(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/users',
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 좋아요 통계 조회를 user-auth로 프록시
   * Proxy like statistics to user-auth */
  // 좋아요 통계 프록시
  @Get('likes')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '좋아요 통계 조회', description: '기간별 좋아요 통계를 조회합니다.' })
  @ApiQuery({ name: 'from', required: false, description: '시작 날짜' })
  @ApiQuery({ name: 'to', required: false, description: '종료 날짜' })
  @ApiResponse({ status: 200, description: '좋아요 통계 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async likes(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/likes',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 채팅 통계 조회를 chat 서비스로 프록시
   * Proxy chat statistics to chat service */
  // 채팅 통계 프록시 (Chat statistics proxy)
  @Get('chat')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '채팅 통계 조회', description: '기간별 채팅 통계를 조회합니다.' })
  @ApiQuery({ name: 'from', required: false, description: '시작 날짜' })
  @ApiQuery({ name: 'to', required: false, description: '종료 날짜' })
  @ApiResponse({ status: 200, description: '채팅 통계 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async chat(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('chat', {
      method: 'GET',
      url: '/statistics',
      params: req.query,
      headers: {
        'x-internal-token': this.configService.get('INTERNAL_SERVICE_SECRET'),
      },
    });
    return res.status(result.status).json(result.data);
  }
}
