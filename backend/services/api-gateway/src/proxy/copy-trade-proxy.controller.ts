/**
 * @file 카피 트레이딩 프록시 컨트롤러
 * @description API Gateway에서 Portfolio 서비스로 카피 트레이딩 요청을 프록시합니다
 *
 * @file Copy Trading Proxy Controller
 * @description Proxies copy trading requests from API Gateway to Portfolio service
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { StartCopyTradeDto, UpdateCopyTradeDto } from './dto/copy-trade.dto';

// 모든 엔드포인트에 JWT 인증 필수 — 카피 트레이딩은 개인 투자 데이터
// All endpoints require JWT auth — copy trading contains personal investment data
@ApiTags('Copy Trading')
@ApiBearerAuth()
@Controller('api/copy-trade')
@UseGuards(JwtAuthGuard)
export class CopyTradeProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  /** 카피 트레이딩 시작 요청을 portfolio 서비스로 프록시
   * Proxy copy trading start to portfolio service */
  @Post('start')
  @ApiOperation({ summary: '카피 트레이딩 시작', description: '특정 트레이더의 거래를 복제하기 시작합니다' })
  @ApiResponse({ status: 201, description: '카피 트레이딩 시작 성공' })
  @ApiResponse({ status: 400, description: '유효성 검사 실패' })
  async startCopyTrading(@Body() body: StartCopyTradeDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as AuthenticatedRequest).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'POST',
      url: '/portfolio/copy-trade/start',
      data: body,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 카피 트레이딩 설정 업데이트 요청을 portfolio 서비스로 프록시
   * Proxy copy trading config update to portfolio service */
  @Put('config/:traderId')
  @ApiOperation({ summary: '카피 트레이딩 설정 변경', description: '스케일 비율, 최대 투자금 등을 변경합니다' })
  @ApiParam({ name: 'traderId', description: '트레이더 ID' })
  @ApiResponse({ status: 200, description: '설정 변경 성공' })
  async updateConfig(
    @Param('traderId') traderId: string,
    @Body() body: UpdateCopyTradeDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as AuthenticatedRequest).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'PUT',
      url: `/portfolio/copy-trade/config/${traderId}`,
      data: body,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 카피 트레이딩 중지 요청을 portfolio 서비스로 프록시
   * Proxy copy trading stop to portfolio service */
  @Post('stop/:traderId')
  @ApiOperation({ summary: '카피 트레이딩 중지', description: '카피 트레이딩을 중지합니다 (데이터 보존)' })
  @ApiParam({ name: 'traderId', description: '트레이더 ID' })
  @ApiResponse({ status: 201, description: '카피 트레이딩 중지 성공' })
  async stopCopyTrading(
    @Param('traderId') traderId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as AuthenticatedRequest).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'POST',
      url: `/portfolio/copy-trade/stop/${traderId}`,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 카피 트레이딩 설정 목록 조회를 portfolio 서비스로 프록시
   * Proxy copy trading config list to portfolio service */
  @Get('status')
  @ApiOperation({ summary: '카피 트레이딩 설정 목록', description: '모든 카피 트레이딩 설정을 반환합니다' })
  @ApiResponse({ status: 200, description: '설정 목록 반환' })
  async getMyConfigs(@Req() req: Request, @Res() res: Response) {
    const userId = (req as AuthenticatedRequest).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/copy-trade/status',
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 특정 트레이더에 대한 카피 트레이딩 설정 조회를 portfolio 서비스로 프록시
   * Proxy specific copy trading config to portfolio service */
  @Get('status/:traderId')
  @ApiOperation({ summary: '카피 트레이딩 설정 조회', description: '특정 트레이더에 대한 카피 트레이딩 설정을 반환합니다' })
  @ApiParam({ name: 'traderId', description: '트레이더 ID' })
  @ApiResponse({ status: 200, description: '설정 반환' })
  async getConfig(
    @Param('traderId') traderId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as AuthenticatedRequest).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: `/portfolio/copy-trade/status/${traderId}`,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 카피 트레이딩 실행 내역 조회를 portfolio 서비스로 프록시
   * Proxy copy trade execution history to portfolio service */
  @Get('history')
  @ApiOperation({ summary: '카피 트레이딩 실행 내역', description: '카피 트레이딩 실행 내역을 반환합니다' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수' })
  @ApiResponse({ status: 200, description: '실행 내역 반환' })
  async getExecutionHistory(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as AuthenticatedRequest).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/copy-trade/history',
      params: { page, limit },
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }
}
