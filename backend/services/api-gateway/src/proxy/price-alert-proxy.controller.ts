/**
 * @file 가격 알림 프록시 컨트롤러
 * @description API Gateway에서 User Auth 서비스의 가격 알림 API로 프록시
 *
 * @file Price Alert Proxy Controller
 * @description Proxies price alert API requests to User Auth service
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/price-alerts')
@UseGuards(JwtAuthGuard)
export class PriceAlertProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/price-alerts',
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Get()
  async list(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/price-alerts',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'DELETE',
      url: `/price-alerts/${id}`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }
}
