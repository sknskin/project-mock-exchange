/**
 * @file 알림 프록시 컨트롤러
 * @description API Gateway에서 User Auth 서비스의 알림 API로 프록시
 *
 * @file Notification Proxy Controller
 * @description Proxies notification API requests to User Auth service
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get()
  @ApiOperation({ summary: '알림 목록 조회', description: '알림 목록을 페이지네이션으로 조회합니다' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 개수' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async list(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/notifications',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '읽지 않은 알림 수 조회', description: '읽지 않은 알림의 총 개수를 조회합니다' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async unreadCount(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/notifications/unread-count',
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '알림 읽음 처리', description: '단일 알림을 읽음으로 표시합니다' })
  @ApiParam({ name: 'id', description: '알림 ID' })
  @ApiResponse({ status: 200, description: '읽음 처리 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async markAsRead(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/notifications/${id}/read`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Post('read-all')
  @ApiOperation({ summary: '전체 알림 읽음 처리', description: '모든 알림을 읽음으로 표시합니다' })
  @ApiResponse({ status: 200, description: '전체 읽음 처리 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async markAllAsRead(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/notifications/read-all',
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '알림 삭제', description: '알림을 삭제합니다' })
  @ApiParam({ name: 'id', description: '알림 ID' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async deleteNotification(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'DELETE',
      url: `/notifications/${id}`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }
}
