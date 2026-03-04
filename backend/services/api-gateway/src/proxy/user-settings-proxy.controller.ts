/**
 * @file 사용자 알림 설정 프록시 컨트롤러
 * @description API Gateway에서 User Auth 서비스의 사용자별 알림 설정 API로 프록시합니다
 *
 * @file User Notification Settings Proxy Controller
 * @description Proxies user-level notification settings API requests to User Auth service
 */
import { Controller, Get, Put, Body, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// 사용자별 알림 환경설정 관리 — JWT 인증 필수 / Per-user notification preferences — JWT auth required
@Controller('api/user/notification-settings')
@UseGuards(JwtAuthGuard)
export class UserSettingsProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get()
  async getAll(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/settings',
      headers: { authorization: req.headers.authorization },
    });
    res.status(result.status).json(result.data);
  }

  @Put()
  async update(@Req() req: Request, @Res() res: Response, @Body() body: Record<string, string>) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'PUT',
      url: '/settings',
      headers: { authorization: req.headers.authorization },
      data: body,
    });
    res.status(result.status).json(result.data);
  }
}
