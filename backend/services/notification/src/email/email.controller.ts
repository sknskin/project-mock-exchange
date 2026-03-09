/**
 * @file 이메일 내부 컨트롤러
 * @description 내부 서비스에서 이메일 전송을 요청하는 엔드포인트
 *
 * @file Email Internal Controller
 * @description Internal endpoint for other services to request email sending
 */
import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsEmail, IsString, IsOptional } from 'class-validator';
import { timingSafeEqual } from 'crypto';
import { EmailService } from './email.service';

// 이메일 전송 요청 DTO — text 또는 html 중 하나 이상 필수
// Email send request DTO — at least one of text or html required
class SendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  subject: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  html?: string;
}

// internal/ 프리픽스: 외부 접근 불가, API Gateway의 x-internal-token 검증을 통해서만 접근
// internal/ prefix: not externally accessible, only via API Gateway's x-internal-token verification
@Controller('internal/email')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /** 내부 서비스 토큰 검증 후 이메일을 전송합니다
   * Send email after verifying internal service token */
  @Post('send')
  async send(
    @Body() dto: SendEmailDto,
    @Headers('x-internal-token') token: string,
  ) {
    // timingSafeEqual 기반 토큰 검증 — 타이밍 공격 방지
    // timingSafeEqual-based token verification — prevents timing attacks
    const secret = this.configService.get<string>('INTERNAL_SERVICE_SECRET');
    if (!token || !secret
      || Buffer.byteLength(token) !== Buffer.byteLength(secret)
      || !timingSafeEqual(Buffer.from(token), Buffer.from(secret))) {
      throw new UnauthorizedException('Invalid internal token');
    }

    const success = await this.emailService.send(dto);
    return { success };
  }
}
