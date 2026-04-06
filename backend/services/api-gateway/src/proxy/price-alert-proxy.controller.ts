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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePriceAlertDto } from './dto/price-alert.dto';

@ApiTags('Price Alerts')
@ApiBearerAuth()
@Controller('api/price-alerts')
@UseGuards(JwtAuthGuard)
export class PriceAlertProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  /** 가격 알림 생성을 user-auth로 프록시
   * Proxy price alert creation to user-auth */
  @Post()
  @ApiOperation({ summary: '가격 알림 생성', description: '새로운 가격 알림을 생성합니다.' })
  @ApiResponse({ status: 201, description: '가격 알림 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async create(@Body() body: CreatePriceAlertDto, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/price-alerts',
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 가격 알림 목록 조회를 user-auth로 프록시
   * Proxy price alert list to user-auth */
  @Get()
  @ApiOperation({ summary: '가격 알림 목록 조회', description: '내 가격 알림 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '가격 알림 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async list(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/price-alerts',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 가격 알림 삭제를 user-auth로 프록시
   * Proxy price alert deletion to user-auth */
  @Delete(':id')
  @ApiOperation({ summary: '가격 알림 삭제', description: '특정 가격 알림을 삭제합니다.' })
  @ApiParam({ name: 'id', description: '삭제할 가격 알림 ID' })
  @ApiResponse({ status: 200, description: '가격 알림 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '가격 알림을 찾을 수 없음' })
  async remove(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'DELETE',
      url: `/price-alerts/${id}`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }
}
