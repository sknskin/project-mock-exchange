import { Controller, Get, Put, Body, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/admin/settings')
@UseGuards(JwtAuthGuard)
export class SettingsProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get()
  async getAll(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/settings',
      headers: req.headers,
    });
    res.status(result.status).json(result.data);
  }

  @Put()
  async bulkUpdate(@Req() req: Request, @Res() res: Response, @Body() body: Record<string, string>) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'PUT',
      url: '/settings',
      headers: req.headers,
      data: body,
    });
    res.status(result.status).json(result.data);
  }
}
