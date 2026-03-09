/**
 * @file 팔로우 프록시 컨트롤러
 * @description API Gateway에서 User Auth 서비스의 팔로우 API로 프록시
 *
 * @file Follow Proxy Controller
 * @description Proxies follow API requests to User Auth service
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// 모든 엔드포인트에 JWT 인증 필수 — 팔로우는 로그인 사용자만 가능
// All endpoints require JWT auth — follow features require authenticated users
@ApiTags('Follow')
@ApiBearerAuth()
@Controller('api/follow')
@UseGuards(JwtAuthGuard)
export class FollowProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * 트레이더 팔로우
   * Follow a trader
   */
  @Post(':userId')
  @ApiOperation({ summary: '트레이더 팔로우', description: '특정 트레이더를 팔로우합니다' })
  @ApiParam({ name: 'userId', description: '팔로우할 사용자 ID' })
  @ApiResponse({ status: 201, description: '팔로우 성공' })
  @ApiResponse({ status: 400, description: '자기 자신 팔로우 불가' })
  @ApiResponse({ status: 409, description: '이미 팔로우 중' })
  async follow(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { id: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/follow/${userId}`,
      headers: { 'x-user-id': user.id },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 트레이더 언팔로우
   * Unfollow a trader
   */
  @Delete(':userId')
  @ApiOperation({ summary: '트레이더 언팔로우', description: '특정 트레이더를 언팔로우합니다' })
  @ApiParam({ name: 'userId', description: '언팔로우할 사용자 ID' })
  @ApiResponse({ status: 200, description: '언팔로우 성공' })
  @ApiResponse({ status: 404, description: '팔로우 관계를 찾을 수 없음' })
  async unfollow(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { id: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'DELETE',
      url: `/follow/${userId}`,
      headers: { 'x-user-id': user.id },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 내가 팔로우하는 사용자 목록
   * List users I'm following
   */
  @Get('following')
  @ApiOperation({ summary: '팔로잉 목록 조회', description: '내가 팔로우하는 사용자 목록을 조회합니다' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수' })
  @ApiResponse({ status: 200, description: '팔로잉 목록 반환 성공' })
  async getFollowing(@Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/follow/following',
      params: req.query,
      headers: { 'x-user-id': user.id },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 특정 사용자의 팔로워 목록
   * List followers of a user
   */
  @Get('followers/:userId')
  @ApiOperation({ summary: '팔로워 목록 조회', description: '특정 사용자의 팔로워 목록을 조회합니다' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수' })
  @ApiResponse({ status: 200, description: '팔로워 목록 반환 성공' })
  async getFollowers(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { id: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: `/follow/followers/${userId}`,
      params: req.query,
      headers: { 'x-user-id': user.id },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 팔로잉/팔로워 수 조회
   * Get follow counts
   */
  @Get('counts/:userId')
  @ApiOperation({ summary: '팔로우 수 조회', description: '특정 사용자의 팔로잉/팔로워 수를 조회합니다' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '팔로우 수 반환 성공' })
  async getFollowCounts(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { id: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: `/follow/counts/${userId}`,
      headers: { 'x-user-id': user.id },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 팔로우 여부 확인
   * Check if I'm following a user
   */
  @Get('status/:userId')
  @ApiOperation({ summary: '팔로우 상태 확인', description: '특정 사용자를 팔로우하고 있는지 확인합니다' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '팔로우 상태 반환 성공' })
  async isFollowing(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { id: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: `/follow/status/${userId}`,
      headers: { 'x-user-id': user.id },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 팔로워 ID 목록 조회 (알림 팬아웃용 내부 엔드포인트)
   * Get follower IDs (internal endpoint for notification fan-out)
   */
  @Get('follower-ids/:userId')
  @ApiOperation({ summary: '팔로워 ID 목록', description: '특정 사용자의 팔로워 ID 목록을 조회합니다 (내부용)' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '팔로워 ID 목록 반환 성공' })
  async getFollowerIds(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { id: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: `/follow/follower-ids/${userId}`,
      headers: { 'x-user-id': user.id },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 알림 모드 변경
   * Update notification mode
   */
  @Put(':userId/notify-mode')
  @ApiOperation({ summary: '알림 모드 변경', description: '팔로우 중인 트레이더의 알림 수신 모드를 변경합니다' })
  @ApiParam({ name: 'userId', description: '팔로우 대상 사용자 ID' })
  @ApiResponse({ status: 200, description: '알림 모드 변경 성공' })
  @ApiResponse({ status: 404, description: '팔로우 관계를 찾을 수 없음' })
  async updateNotifyMode(
    @Param('userId') userId: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { id: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'PUT',
      url: `/follow/${userId}/notify-mode`,
      data: body,
      headers: { 'x-user-id': user.id },
    });
    return res.status(result.status).json(result.data);
  }
}
