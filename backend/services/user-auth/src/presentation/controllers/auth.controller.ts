/**
 * @file 인증 컨트롤러
 * @description 회원가입, 로그인, 토큰 갱신 등 인증 API 엔드포인트를 처리합니다
 *
 * @file Auth Controller
 * @description Handles authentication API endpoints: register, login, token refresh, etc.
 */
import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from '../../application/services/auth.service';
import { SmsVerificationService } from '../../application/services/sms-verification.service';
import { TotpService } from '../../application/services/totp.service';
import { RegisterRequestDto } from '../dto/register.dto';
import { LoginRequestDto } from '../dto/login.dto';
import { VerifyLoginSmsDto } from '../dto/verify-login-sms.dto';
import { ForgotPasswordDto, ForgotPasswordVerifySmsDto, ResetPasswordDto } from '../dto/forgot-password.dto';
import { SendCodeRequestDto, VerifyCodeRequestDto } from '../dto/sms-verification.dto';
import { JwtAuthGuard } from '../../infrastructure/config/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/config/current-user.decorator';
import { UserDto } from '@virtuex/common';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@UseGuards(InternalAuthGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly smsVerificationService: SmsVerificationService,
    private readonly totpService: TotpService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterRequestDto) {
    const user = await this.authService.register({
      email: dto.email,
      username: dto.username,
      password: dto.password,
      passwordConfirm: dto.passwordConfirm,
      name: dto.name,
      phone: dto.phone,
      residentNumber: dto.residentNumber,
      address: dto.address,
      addressDetail: dto.addressDetail,
      zipCode: dto.zipCode,
    });
    return { success: true, data: user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginRequestDto) {
    const result = await this.authService.login(dto.identifier, dto.password);

    return {
      success: true,
      data: {
        requireSmsVerification: result.requireSmsVerification,
        sessionId: result.sessionId,
        maskedPhone: result.maskedPhone,
      },
    };
  }

  @Post('login/verify-sms')
  @HttpCode(HttpStatus.OK)
  async verifyLoginSms(
    @Body() dto: VerifyLoginSmsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyLoginSms(dto.sessionId, dto.code);

    if (!result.success) {
      return {
        success: false,
        data: { attemptsLeft: result.attemptsLeft },
        message: result.message,
      };
    }

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    return {
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!oldToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'No refresh token provided',
      });
    }

    const { tokens, refreshToken } = await this.authService.refreshTokens(oldToken);

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);

    return {
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (token) {
      await this.authService.logout(token);
    }

    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/auth' });

    return { success: true, message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: UserDto) {
    return { success: true, data: user };
  }

  @Post('sms/send')
  @HttpCode(HttpStatus.OK)
  async sendSmsCode(@Body() dto: SendCodeRequestDto) {
    await this.smsVerificationService.sendVerificationCode(dto.phone);
    return { success: true, message: 'Verification code sent' };
  }

  @Post('sms/verify')
  @HttpCode(HttpStatus.OK)
  async verifySmsCode(@Body() dto: VerifyCodeRequestDto) {
    await this.smsVerificationService.verifyCode(dto.phone, dto.code);
    return { success: true, message: 'Phone verified' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.requestPasswordReset(dto.identifier);
    return { success: true, data: result };
  }

  @Post('forgot-password/verify-sms')
  @HttpCode(HttpStatus.OK)
  async forgotPasswordVerifySms(@Body() dto: ForgotPasswordVerifySmsDto) {
    const result = await this.authService.verifyPasswordResetSms(dto.sessionId, dto.code);
    if (!result.success) {
      return { success: false, data: { attemptsLeft: result.attemptsLeft }, message: result.message };
    }
    return { success: true };
  }

  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.sessionId, dto.newPassword, dto.confirmPassword);
    return { success: true, message: 'Password has been reset' };
  }

  @Get('check-duplicate')
  async checkDuplicate(
    @Query('field') field: string,
    @Query('value') value: string,
  ) {
    const exists = await this.authService.checkDuplicate(field, value);
    return { success: true, data: { exists } };
  }

  // ── TOTP 2FA ──

  @Post('totp/setup')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async totpSetup(@CurrentUser() user: UserDto) {
    const result = await this.totpService.setup(user.id);
    return { success: true, data: result };
  }

  @Post('totp/enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async totpEnable(
    @CurrentUser() user: UserDto,
    @Body('code') code: string,
  ) {
    await this.totpService.enable(user.id, code);
    return { success: true, message: 'TOTP enabled' };
  }

  @Post('totp/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async totpDisable(
    @CurrentUser() user: UserDto,
    @Body('code') code: string,
  ) {
    await this.totpService.disable(user.id, code);
    return { success: true, message: 'TOTP disabled' };
  }

  @Post('totp/verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async totpVerify(
    @CurrentUser() user: UserDto,
    @Body('code') code: string,
  ) {
    const valid = await this.totpService.verify(user.id, code);
    return { success: true, data: { valid } };
  }

  @Get('totp/status')
  @UseGuards(JwtAuthGuard)
  async totpStatus(@CurrentUser() user: UserDto) {
    const enabled = await this.totpService.isEnabled(user.id);
    return { success: true, data: { enabled } };
  }
}
