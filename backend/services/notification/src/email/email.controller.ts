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
import { EmailService } from './email.service';

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

@Controller('internal/email')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @Post('send')
  async send(
    @Body() dto: SendEmailDto,
    @Headers('x-internal-token') token: string,
  ) {
    const secret = this.configService.get<string>('INTERNAL_SERVICE_SECRET');
    if (!token || token !== secret) {
      throw new UnauthorizedException('Invalid internal token');
    }

    const success = await this.emailService.send(dto);
    return { success };
  }
}
