/**
 * @file 전략 공유 프록시 컨트롤러
 * @description API Gateway에서 User Auth 서비스의 전략 공유 API로 프록시
 *
 * @file Strategy Sharing Proxy Controller
 * @description Proxies strategy sharing API requests to User Auth service
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
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard, OptionalAuth } from '../auth/jwt-auth.guard';

// 컨트롤러 레벨에서 JwtAuthGuard 적용 — @OptionalAuth()로 개별 엔드포인트에서 인증 선택적 해제
// JwtAuthGuard applied at controller level — @OptionalAuth() makes auth optional per endpoint
@ApiTags('Strategies')
@ApiBearerAuth()
@Controller('api/strategies')
@UseGuards(JwtAuthGuard)
export class StrategyProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * 전략 목록 조회 (인증 선택)
   * List strategies (optional auth — if logged in, pass x-user-id for like status)
   */
  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: '전략 목록', description: '전략 목록을 페이징, 검색, 심볼 필터링 조건과 함께 조회합니다' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수' })
  @ApiQuery({ name: 'symbol', required: false, description: '심볼 필터' })
  @ApiQuery({ name: 'search', required: false, description: '검색어' })
  @ApiResponse({ status: 200, description: '전략 목록 반환 성공' })
  async listStrategies(@Req() req: Request, @Res() res: Response) {
    // 인증된 사용자 정보가 있으면 헤더로 전달 — 좋아요 여부 확인에 사용
    // Pass authenticated user info via headers if available — used for like status
    const user = req.user as { id: string; role?: string; name?: string } | undefined;
    const headers: Record<string, string> = {};
    if (user?.id) {
      headers['x-user-id'] = user.id;
      headers['x-user-role'] = user.role || '';
      // 한글 이름은 HTTP 헤더에서 안전하게 전송하기 위해 encodeURIComponent 사용
      // encodeURIComponent for Korean names to safely transmit in HTTP headers
      headers['x-user-name'] = encodeURIComponent(user.name || '');
    }

    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/strategies',
      params: req.query,
      headers,
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 전략 상세 조회 (인증 선택)
   * Get strategy detail (optional auth)
   */
  @Get(':id')
  @OptionalAuth()
  @ApiOperation({ summary: '전략 상세', description: '특정 전략의 상세 내용을 조회합니다. 인증 시 좋아요 여부 등 추가 정보가 포함됩니다' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  @ApiResponse({ status: 200, description: '전략 상세 반환 성공' })
  @ApiResponse({ status: 404, description: '전략을 찾을 수 없음' })
  async getStrategy(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; role?: string; name?: string } | undefined;
    const headers: Record<string, string> = {};
    if (user?.id) {
      headers['x-user-id'] = user.id;
      headers['x-user-role'] = user.role || '';
      headers['x-user-name'] = encodeURIComponent(user.name || '');
    }

    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: `/strategies/${id}`,
      headers,
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 전략 작성 (인증 필수)
   * Create strategy (requires auth)
   */
  @Post()
  @ApiOperation({ summary: '전략 작성', description: '새 전략을 작성합니다' })
  @ApiResponse({ status: 201, description: '전략 작성 성공' })
  @ApiResponse({ status: 400, description: '유효성 검사 실패' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async createStrategy(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/strategies',
      data: body,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 전략 수정 (인증 필수, 작성자만)
   * Update strategy (requires auth, author only)
   */
  @Put(':id')
  @ApiOperation({ summary: '전략 수정', description: '전략을 수정합니다. 작성자만 가능합니다' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  @ApiResponse({ status: 200, description: '전략 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '전략을 찾을 수 없음' })
  async updateStrategy(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'PUT',
      url: `/strategies/${id}`,
      data: body,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 전략 삭제 (인증 필수, 작성자 또는 관리자)
   * Delete strategy (requires auth, author or admin)
   */
  @Delete(':id')
  @ApiOperation({ summary: '전략 삭제', description: '전략을 삭제합니다. 작성자 또는 관리자만 가능합니다' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  @ApiResponse({ status: 200, description: '전략 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '전략을 찾을 수 없음' })
  async deleteStrategy(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'DELETE',
      url: `/strategies/${id}`,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 전략 좋아요 토글 (인증 필수)
   * Toggle strategy like (requires auth)
   */
  @Post(':id/like')
  @ApiOperation({ summary: '전략 좋아요 토글', description: '전략에 대한 좋아요를 추가하거나 취소합니다' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  @ApiResponse({ status: 200, description: '좋아요 상태 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '전략을 찾을 수 없음' })
  async toggleStrategyLike(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/strategies/${id}/like`,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 조회수 증가 (인증 불필요)
   * Increment view count (no auth required)
   */
  // 조회수 조작 방지를 위해 ThrottlerGuard로 1분당 10회 제한
  // ThrottlerGuard limits to 10/min to prevent view count manipulation
  @Post(':id/view')
  @OptionalAuth()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '전략 조회수 증가', description: '전략의 조회수를 1 증가시킵니다' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  @ApiResponse({ status: 200, description: '조회수 증가 성공' })
  @ApiResponse({ status: 404, description: '전략을 찾을 수 없음' })
  async incrementViewCount(@Param('id') id: string, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/strategies/${id}/view`,
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 전략 댓글 작성 (인증 필수)
   * Create strategy comment (requires auth)
   */
  @Post(':id/comments')
  @ApiOperation({ summary: '전략 댓글 작성', description: '전략에 새 댓글을 작성합니다. parentId를 전달하면 대댓글이 됩니다' })
  @ApiParam({ name: 'id', description: '전략 ID' })
  @ApiResponse({ status: 201, description: '댓글 작성 성공' })
  @ApiResponse({ status: 400, description: '유효성 검사 실패' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '전략을 찾을 수 없음' })
  async createComment(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/strategies/${id}/comments`,
      data: body,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 전략 댓글 삭제 (인증 필수, 작성자 또는 관리자)
   * Delete strategy comment (requires auth, author or admin)
   */
  @Delete('comments/:id')
  @ApiOperation({ summary: '전략 댓글 삭제', description: '전략 댓글을 삭제합니다. 작성자 또는 관리자만 가능합니다' })
  @ApiParam({ name: 'id', description: '댓글 ID' })
  @ApiResponse({ status: 200, description: '댓글 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '댓글을 찾을 수 없음' })
  async deleteComment(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'DELETE',
      url: `/strategies/comments/${id}`,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }
}
