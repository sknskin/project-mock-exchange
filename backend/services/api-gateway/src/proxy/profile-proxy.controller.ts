/**
 * @file 프로필 프록시 컨트롤러
 * @description API Gateway에서 User Auth 서비스의 프로필/알림/통계 API로 프록시
 *
 * @file Profile Proxy Controller
 * @description Proxies profile, notification, and statistics API requests
 */
import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/profile')
@UseGuards(JwtAuthGuard)
export class ProfileProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get()
  async getProfile(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/profile',
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Put()
  async updateProfile(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'PUT',
      url: '/profile',
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Post('change-password')
  async changePassword(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/profile/change-password',
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }
}
