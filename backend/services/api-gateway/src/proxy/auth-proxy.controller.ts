/**
 * @file 인증 프록시 컨트롤러
 * @description API Gateway에서 User Auth 서비스로 인증 요청을 프록시합니다
 *
 * @file Auth Proxy Controller
 * @description Proxies authentication requests from API Gateway to User Auth service
 */
import { Controller, Post, Get, Body, Req, Res, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatGateway } from '../gateway/chat.gateway';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('register')
  @ApiOperation({ summary: '회원가입', description: '새 사용자 계정을 생성합니다' })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 400, description: '유효성 검사 실패' })
  @ApiResponse({ status: 409, description: '중복된 이메일 또는 아이디' })
  async register(@Body() body: unknown, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/register',
      data: body,
    });
    if (result.status < 400) {
      const data = result.data as { username?: string; name?: string };
      this.chatGateway.server.emit('notification:registration-request', {
        type: 'registration-request',
        username: data.username || (body as { username?: string })?.username || '',
        name: data.name || (body as { name?: string })?.name || '',
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(result.status).json(result.data);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인', description: '이메일/아이디와 비밀번호로 로그인합니다 (SMS 인증 필요)' })
  @ApiResponse({ status: 200, description: 'SMS 인증 요청 (sessionId + maskedPhone)' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(@Body() body: unknown, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/login',
      data: body,
    });

    return res.status(result.status).json(result.data);
  }

  @Post('login/verify-sms')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인 SMS 인증', description: '로그인 2단계 SMS 인증번호를 검증합니다' })
  @ApiResponse({ status: 200, description: '인증 성공 (access token + refresh cookie)' })
  @ApiResponse({ status: 401, description: '인증 실패 또는 세션 만료' })
  async verifyLoginSms(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/login/verify-sms',
      data: body,
      headers: {
        Cookie: req.headers.cookie || '',
      },
    });

    // user-auth에서 Set-Cookie 헤더 전달 / Forward Set-Cookie headers from user-auth
    const setCookieHeader = result.headers?.['set-cookie'];
    if (setCookieHeader) {
      res.setHeader('Set-Cookie', setCookieHeader);
    }

    return res.status(result.status).json(result.data);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토큰 갱신', description: 'Refresh token으로 새 access token을 발급합니다' })
  @ApiResponse({ status: 200, description: '토큰 갱신 성공' })
  @ApiResponse({ status: 401, description: 'Refresh token 만료 또는 무효' })
  async refresh(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/refresh',
      headers: {
        Cookie: req.headers.cookie || '',
      },
    });

    // user-auth에서 Set-Cookie 헤더 전달 / Forward Set-Cookie headers from user-auth
    const setCookieHeader = result.headers?.['set-cookie'];
    if (setCookieHeader) {
      res.setHeader('Set-Cookie', setCookieHeader);
    }

    return res.status(result.status).json(result.data);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그아웃', description: 'Refresh token을 무효화하고 쿠키를 제거합니다' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logout(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/logout',
      headers: {
        Cookie: req.headers.cookie || '',
      },
    });
    res.clearCookie('refresh_token', { path: '/auth' });
    return res.status(result.status).json(result.data);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보 조회', description: '현재 로그인한 사용자 정보를 반환합니다' })
  @ApiResponse({ status: 200, description: '사용자 정보 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async me(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/auth/me',
      headers: {
        Authorization: req.headers.authorization || '',
      },
    });
    return res.status(result.status).json(result.data);
  }

  @Post('sms/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'SMS 인증번호 발송', description: '입력한 전화번호로 인증번호를 발송합니다' })
  @ApiResponse({ status: 200, description: '인증번호 발송 성공' })
  @ApiResponse({ status: 400, description: '잘못된 전화번호 형식' })
  async sendSmsCode(@Body() body: unknown, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/sms/send',
      data: body,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('sms/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'SMS 인증번호 확인', description: '발송된 인증번호를 검증합니다' })
  @ApiResponse({ status: 200, description: '인증 성공' })
  @ApiResponse({ status: 400, description: '잘못된 인증번호' })
  async verifySmsCode(@Body() body: unknown, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/sms/verify',
      data: body,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('check-duplicate')
  @ApiOperation({ summary: '중복 확인', description: '이메일 또는 아이디의 중복 여부를 확인합니다' })
  @ApiQuery({ name: 'field', description: '확인할 필드 (email | username)' })
  @ApiQuery({ name: 'value', description: '확인할 값' })
  @ApiResponse({ status: 200, description: '중복 확인 결과 반환' })
  async checkDuplicate(
    @Query('field') field: string,
    @Query('value') value: string,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/auth/check-duplicate',
      params: { field, value },
    });
    return res.status(result.status).json(result.data);
  }
}
