/**
 * @file 관리자 설정 프록시 컨트롤러
 * @description API Gateway에서 User Auth 서비스의 관리자 설정 API로 프록시합니다
 *
 * @file Admin Settings Proxy Controller
 * @description Proxies admin settings API requests to User Auth service
 */
import { Controller, Get, Put, Body, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRolesGuard } from '../auth/admin-roles.guard';

// 관리자 전용 설정 관리 — JWT 인증 + 관리자 역할 필수 / Admin-only settings management — JWT auth + admin role required
@Controller('api/admin/settings')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class SettingsProxyController {
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
  async bulkUpdate(@Req() req: Request, @Res() res: Response, @Body() body: Record<string, string>) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'PUT',
      url: '/settings',
      headers: { authorization: req.headers.authorization },
      data: body,
    });
    res.status(result.status).json(result.data);
  }
}
