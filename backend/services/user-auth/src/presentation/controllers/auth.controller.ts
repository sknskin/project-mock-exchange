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
import { RegisterRequestDto } from '../dto/register.dto';
import { LoginRequestDto } from '../dto/login.dto';
import { SendCodeRequestDto, VerifyCodeRequestDto } from '../dto/sms-verification.dto';
import { JwtAuthGuard } from '../../infrastructure/config/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/config/current-user.decorator';
import { UserDto } from '@mock-exchange/common';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly smsVerificationService: SmsVerificationService,
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
  async login(
    @Body() dto: LoginRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens, refreshToken } = await this.authService.login(
      dto.identifier,
      dto.password,
    );

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);

    return {
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
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

    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/auth' });

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

  @Get('check-duplicate')
  async checkDuplicate(
    @Query('field') field: string,
    @Query('value') value: string,
  ) {
    const exists = await this.authService.checkDuplicate(field, value);
    return { success: true, data: { exists } };
  }
}
