/**
 * @file 포트폴리오 프록시 컨트롤러
 * @description API Gateway에서 Portfolio 서비스로 포트폴리오 요청을 프록시합니다
 *
 * @file Portfolio Proxy Controller
 * @description Proxies portfolio requests from API Gateway to Portfolio service
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// 모든 엔드포인트에 JWT 인증 필수 — 포트폴리오는 개인 자산 데이터
// All endpoints require JWT auth — portfolio contains personal asset data
@ApiTags('Portfolio')
@ApiBearerAuth()
@Controller('api/portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  /** 가상 자금 입금 요청을 portfolio 서비스로 프록시
   * Proxy virtual fund deposit to portfolio service */
  @Post('deposit')
  @ApiOperation({ summary: '자금 입금', description: '포트폴리오에 가상 자금을 입금합니다' })
  @ApiResponse({ status: 201, description: '입금 성공' })
  @ApiResponse({ status: 400, description: '유효성 검사 실패' })
  async deposit(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    // JWT에서 추출된 userId를 x-user-id 헤더로 전달 — 서비스 간 인증 / Pass JWT-extracted userId via x-user-id header for inter-service auth
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'POST',
      url: '/portfolio/deposit',
      data: body,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 계정 초기화 요청을 portfolio 서비스로 프록시
   * Proxy account reset to portfolio service */
  @Post('reset')
  @ApiOperation({ summary: '계정 초기화', description: '보유 자산, 거래 내역 삭제 및 잔고를 초기 상태로 리셋합니다' })
  @ApiResponse({ status: 201, description: '초기화 성공' })
  async resetAccount(@Req() req: Request, @Res() res: Response) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'POST',
      url: '/portfolio/reset',
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 가상 자금 출금 요청을 portfolio 서비스로 프록시
   * Proxy virtual fund withdrawal to portfolio service */
  @Post('withdraw')
  @ApiOperation({ summary: '자금 출금', description: '포트폴리오에서 가상 자금을 출금합니다' })
  @ApiResponse({ status: 201, description: '출금 성공' })
  @ApiResponse({ status: 400, description: '잔고 부족 또는 유효성 검사 실패' })
  async withdraw(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'POST',
      url: '/portfolio/withdraw',
      data: body,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 잔고 조회를 portfolio 서비스로 프록시
   * Proxy balance inquiry to portfolio service */
  @Get('balance')
  @ApiOperation({ summary: '잔고 조회', description: '현재 사용자의 잔고를 반환합니다' })
  @ApiResponse({ status: 200, description: '잔고 정보 반환' })
  async getBalance(@Req() req: Request, @Res() res: Response) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/balance',
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 보유 자산 목록 조회를 portfolio 서비스로 프록시
   * Proxy holdings list to portfolio service */
  @Get('holdings')
  @ApiOperation({ summary: '보유 자산 조회', description: '현재 사용자의 보유 자산 목록을 반환합니다' })
  @ApiResponse({ status: 200, description: '보유 자산 목록 반환' })
  async getHoldings(@Req() req: Request, @Res() res: Response) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/holdings',
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 포트폴리오 요약 조회를 portfolio 서비스로 프록시
   * Proxy portfolio summary to portfolio service */
  @Get('summary')
  @ApiOperation({ summary: '포트폴리오 요약', description: '총 자산, 수익률 등 포트폴리오 요약 정보를 반환합니다' })
  @ApiResponse({ status: 200, description: '포트폴리오 요약 반환' })
  async getSummary(@Req() req: Request, @Res() res: Response) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/summary',
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 자산 평가액 조회를 portfolio 서비스로 프록시
   * Proxy asset valuation to portfolio service */
  @Get('valuation')
  @ApiOperation({ summary: '자산 평가 조회', description: '보유 자산의 현재 평가액을 반환합니다' })
  @ApiResponse({ status: 200, description: '자산 평가 반환' })
  async getValuation(@Req() req: Request, @Res() res: Response) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/valuation',
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 리더보드 조회 후 사용자 정보 보강 및 개인정보 마스킹
   * Proxy leaderboard with user enrichment and PII masking */
  @Get('leaderboard')
  @ApiOperation({ summary: '리더보드 조회', description: '수익률 기준 상위 사용자 랭킹을 반환합니다' })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수 (기본값: 10)' })
  @ApiResponse({ status: 200, description: '리더보드 반환' })
  async getLeaderboard(
    @Query('limit') limit: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const currentUserId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/leaderboard',
      params: { limit },
    });

    /**
     * 리더보드 데이터 보강 및 개인정보 마스킹 처리 (감사보고서 #12 권고사항)
     * - user-auth에서 사용자명/이름 조회하여 리더보드 항목에 매핑
     * - 현재 로그인 사용자의 userId만 유지, 나머지는 익명화(anon_N)
     *
     * Enrich leaderboard entries and mask PII (Audit Report #12 recommendation)
     * - Fetch username/name from user-auth and map to leaderboard entries
     * - Keep userId only for the current user, anonymize others (anon_N)
     */
    const data = result.data as Record<string, unknown>;
    if (data?.success && Array.isArray(data?.data)) {
      const entries = data.data as Record<string, unknown>[];
      const userIds = entries.map((e) => e.userId).filter(Boolean) as string[];
      if (userIds.length > 0) {
        try {
          const usersResult = await this.proxyService.forward('user-auth', {
            method: 'POST',
            url: '/users/by-ids',
            data: { ids: userIds },
          });
          const usersData = usersResult.data as Record<string, unknown>;
          if (usersData?.success && Array.isArray(usersData?.data)) {
            const userMap = new Map<string, { username: string; name: string }>();
            for (const u of usersData.data as Record<string, string>[]) {
              userMap.set(u.id, { username: u.username, name: u.name });
            }
            data.data = entries.map((entry, idx) => {
              const userInfo = userMap.get(entry.userId as string);
              const isMe = currentUserId && entry.userId === currentUserId;
              const { userId: _uid, ...rest } = entry;
              return {
                ...rest,
                // 인증된 사용자에게는 실제 ID 제공(팔로우 기능용), 비인증 시 익명화
                // Provide real ID to authenticated users (for follow), anonymize for guests
                id: currentUserId ? entry.userId : `anon_${idx}`,
                isMe: !!isMe,
                username: userInfo?.username || '',
                name: userInfo?.name || '',
              };
            });
          }
        } catch {
          // Fallback: strip userId even without names
          data.data = entries.map((entry, idx) => {
            const isMe = currentUserId && entry.userId === currentUserId;
            const { userId: _uid, ...rest } = entry;
            return { ...rest, id: currentUserId ? entry.userId : `anon_${idx}`, isMe: !!isMe };
          });
        }
      }
    }

    return res.status(result.status).json(result.data);
  }

  /** 거래 내역 조회를 portfolio 서비스로 프록시
   * Proxy transaction history to portfolio service */
  @Get('transactions')
  @ApiOperation({ summary: '거래 내역 조회', description: '입출금 및 매수/매도 거래 내역을 반환합니다' })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수' })
  @ApiQuery({ name: 'offset', required: false, description: '오프셋' })
  @ApiResponse({ status: 200, description: '거래 내역 반환' })
  async getTransactions(
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/transactions',
      params: { limit, offset },
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 활동 피드 조회 — user-auth에서 팔로잉 목록을 조회한 후 portfolio 서비스로 프록시
   * Proxy activity feed with user enrichment — get following IDs from user-auth then forward to portfolio */
  @Get('feed')
  @ApiOperation({ summary: '활동 피드 조회', description: '팔로잉 중인 트레이더들의 거래 활동 피드를 반환합니다' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수' })
  @ApiResponse({ status: 200, description: '활동 피드 반환' })
  async getFeed(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as Record<string, any>).user?.id;

    // user-auth에서 팔로잉 목록 조회 / Get following IDs from user-auth
    let followingIds = '';
    try {
      const followingResult = await this.proxyService.forward('user-auth', {
        method: 'GET',
        url: '/users/following',
        headers: { 'x-user-id': userId },
      });
      const followingData = followingResult.data as Record<string, unknown>;
      if (followingData?.success && Array.isArray(followingData?.data)) {
        followingIds = (followingData.data as string[]).join(',');
      }
    } catch {
      // 팔로잉 목록 조회 실패 시 빈 피드 반환 / Return empty feed on following list failure
    }

    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/feed',
      params: { followingIds, page, limit },
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 특정 트레이더의 공개 활동 조회를 portfolio 서비스로 프록시
   * Proxy specific trader's public activities to portfolio service */
  @Get('activities/:userId')
  @ApiOperation({ summary: '트레이더 활동 조회', description: '특정 트레이더의 공개 거래 활동을 반환합니다' })
  @ApiParam({ name: 'userId', description: '트레이더 ID' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수' })
  @ApiResponse({ status: 200, description: '트레이더 활동 반환' })
  async getUserActivities(
    @Param('userId') targetUserId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: `/portfolio/activities/${targetUserId}`,
      params: { page, limit },
    });
    return res.status(result.status).json(result.data);
  }

  /** 관심종목 목록 조회를 portfolio 서비스로 프록시
   * Proxy watchlist retrieval to portfolio service */
  @Get('watchlist')
  @ApiOperation({ summary: '관심종목 조회', description: '관심종목 심볼 목록을 반환합니다' })
  @ApiResponse({ status: 200, description: '관심종목 목록 반환' })
  async getWatchlist(@Req() req: Request, @Res() res: Response) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/watchlist',
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 관심종목 추가를 portfolio 서비스로 프록시
   * Proxy watchlist add to portfolio service */
  @Post('watchlist/:symbol')
  @ApiOperation({ summary: '관심종목 추가', description: '종목을 관심종목에 추가합니다' })
  @ApiResponse({ status: 201, description: '관심종목 추가 성공' })
  async addWatchlist(
    @Param('symbol') symbol: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'POST',
      url: `/portfolio/watchlist/${symbol}`,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 관심종목 삭제를 portfolio 서비스로 프록시
   * Proxy watchlist removal to portfolio service */
  @Delete('watchlist/:symbol')
  @ApiOperation({ summary: '관심종목 삭제', description: '종목을 관심종목에서 삭제합니다' })
  @ApiResponse({ status: 200, description: '관심종목 삭제 성공' })
  async removeWatchlist(
    @Param('symbol') symbol: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'DELETE',
      url: `/portfolio/watchlist/${symbol}`,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }
}
