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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('api/profile')
@UseGuards(JwtAuthGuard)
export class ProfileProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  /** 내 프로필 조회를 user-auth로 프록시
   * Proxy profile retrieval to user-auth */
  @Get()
  @ApiOperation({ summary: '내 프로필 조회', description: '현재 로그인한 사용자의 프로필 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async getProfile(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/profile',
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 프로필 수정을 user-auth로 프록시
   * Proxy profile update to user-auth */
  @Put()
  @ApiOperation({ summary: '프로필 수정', description: '현재 로그인한 사용자의 프로필 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '프로필 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async updateProfile(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'PUT',
      url: '/profile',
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 비밀번호 변경을 user-auth로 프록시
   * Proxy password change to user-auth */
  @Post('change-password')
  @ApiOperation({ summary: '비밀번호 변경', description: '현재 로그인한 사용자의 비밀번호를 변경합니다.' })
  @ApiResponse({ status: 200, description: '비밀번호 변경 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 (현재 비밀번호 불일치 등)' })
  @ApiResponse({ status: 401, description: '인증 실패' })
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
