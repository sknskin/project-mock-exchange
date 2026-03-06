/**
 * @file 인증 프록시 컨트롤러
 * @description API Gateway에서 User Auth 서비스로 인증 요청을 프록시합니다
 *
 * @file Auth Proxy Controller
 * @description Proxies authentication requests from API Gateway to User Auth service
 */
import { Controller, Post, Get, Body, Req, Res, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatGateway } from '../gateway/chat.gateway';

// 인증 관련 모든 엔드포인트를 처리하는 프록시 컨트롤러
// Proxy controller handling all authentication-related endpoints
@ApiTags('Auth')
@Controller('api/auth')
export class AuthProxyController {
  constructor(
    // ProxyService: 내부 마이크로서비스로 HTTP 요청 전달 / Forwards HTTP requests to internal microservices
    private readonly proxyService: ProxyService,
    // ChatGateway: WebSocket을 통한 실시간 알림 전송 / Sends real-time notifications via WebSocket
    private readonly chatGateway: ChatGateway,
  ) {}

  // 회원가입 — 하루 3회 제한으로 자동화된 대량 등록 방지 / Register — 3/day rate limit prevents automated mass registration
  @Post('register')
  @Throttle({ default: { ttl: 86400000, limit: 3 } })
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
    // 성공 시 WebSocket으로 관리자에게 가입 요청 알림 전송 / On success, notify admins of new registration request via WebSocket
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

  // 로그인 — 1분 5회 제한으로 무차별 대입 방지 / Login — 5/min rate limit prevents brute-force attacks
  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
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

  // 로그인 SMS 재전송 — 분당 3회 제한으로 SMS 남용 방지
  // Resend login SMS — 3/min rate limit prevents SMS abuse
  @Post('login/resend-sms')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인 SMS 재전송', description: '로그인 SMS 인증번호를 재전송합니다' })
  @ApiResponse({ status: 200, description: 'SMS 재전송 성공' })
  async resendLoginSms(@Body() body: unknown, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/login/resend-sms',
      data: body,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('login/verify-sms')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인 SMS 인증', description: '로그인 2단계 SMS 인증번호를 검증합니다' })
  @ApiResponse({ status: 200, description: '인증 성공 (access token + refresh cookie)' })
  @ApiResponse({ status: 401, description: '인증 실패 또는 세션 만료' })
  async verifyLoginSms(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    // 쿠키 전달 — user-auth에서 리프레시 토큰 검증에 사용 / Forward cookies — used by user-auth for refresh token validation
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
    // 클라이언트 쿠키 제거 — path 일치 필수 / Clear client cookie — path must match the original cookie path
    res.clearCookie('refresh_token', { path: '/api/auth' });
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
  @Throttle({ default: { ttl: 60000, limit: 5 } })
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

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 찾기', description: '이메일/아이디로 비밀번호 재설정 SMS를 발송합니다' })
  @ApiResponse({ status: 200, description: 'SMS 발송 성공 (sessionId + maskedPhone)' })
  async forgotPassword(@Body() body: unknown, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/forgot-password',
      data: body,
    });
    return res.status(result.status).json(result.data);
  }

  // 비밀번호 찾기 SMS 재전송 — 분당 3회 제한으로 SMS 남용 방지
  // Resend forgot-password SMS — 3/min rate limit prevents SMS abuse
  @Post('forgot-password/resend-sms')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 찾기 SMS 재전송', description: '비밀번호 재설정 SMS 인증번호를 재전송합니다' })
  @ApiResponse({ status: 200, description: 'SMS 재전송 성공' })
  async resendPasswordResetSms(@Body() body: unknown, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/forgot-password/resend-sms',
      data: body,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('forgot-password/verify-sms')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 찾기 SMS 인증', description: '비밀번호 재설정 SMS 인증번호를 검증합니다' })
  @ApiResponse({ status: 200, description: '인증 성공' })
  async forgotPasswordVerifySms(@Body() body: unknown, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/forgot-password/verify-sms',
      data: body,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('forgot-password/reset')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 재설정', description: 'SMS 인증 후 새 비밀번호를 설정합니다' })
  @ApiResponse({ status: 200, description: '비밀번호 재설정 성공' })
  async resetPassword(@Body() body: unknown, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/forgot-password/reset',
      data: body,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('check-duplicate')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
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

  // ── TOTP 2FA (시간 기반 일회용 비밀번호 2단계 인증) / Time-based One-Time Password 2-Factor Authentication ──

  @Post('totp/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'TOTP 설정', description: 'TOTP 2FA 시크릿 키를 생성합니다' })
  async totpSetup(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/totp/setup',
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Post('totp/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'TOTP 활성화', description: 'TOTP 코드 검증 후 2FA를 활성화합니다' })
  async totpEnable(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/totp/enable',
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Post('totp/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'TOTP 비활성화', description: 'TOTP 코드 검증 후 2FA를 비활성화합니다' })
  async totpDisable(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/totp/disable',
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Post('totp/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'TOTP 검증', description: 'TOTP 코드를 검증합니다' })
  async totpVerify(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/totp/verify',
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('totp/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'TOTP 상태 조회', description: 'TOTP 2FA 활성화 여부를 확인합니다' })
  async totpStatus(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/auth/totp/status',
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }
}
