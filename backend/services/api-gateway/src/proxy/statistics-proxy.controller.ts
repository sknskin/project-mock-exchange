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
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/statistics')
export class StatisticsProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  // Public endpoint for page view tracking
  @Post('page-view')
  async trackPageView(@Body() body: unknown, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/statistics/page-view',
      data: body,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  async overview(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/overview',
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('registrations')
  @UseGuards(JwtAuthGuard)
  async registrations(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/registrations',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('logins')
  @UseGuards(JwtAuthGuard)
  async logins(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/logins',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('page-views')
  @UseGuards(JwtAuthGuard)
  async pageViews(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/page-views',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('announcements')
  @UseGuards(JwtAuthGuard)
  async announcements(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/announcements',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  async users(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/statistics/users',
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }
}
