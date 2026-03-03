import { Controller, Get, Put, Body, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
