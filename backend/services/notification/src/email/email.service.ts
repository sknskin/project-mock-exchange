/**
 * @file 이메일 전송 서비스
 * @description nodemailer를 사용하여 이메일을 전송합니다
 *
 * @file Email Service
 * @description Sends emails using nodemailer
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 포트는 암시적 TLS (SMTPS) / Port 465 uses implicit TLS (SMTPS)
        auth: { user, pass },
      });
      this.logger.log(`Email transport configured: ${host}:${port}`);
    } else {
      // 개발 환경용 Mock transport — 실제 이메일을 보내지 않고 JSON 로그로 출력
      // Mock transport for development — logs as JSON instead of sending real emails
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      this.logger.warn(
        'SMTP not configured — using mock transport (emails logged to console)',
      );
    }
  }

  async send(options: SendEmailOptions): Promise<boolean> {
    const from = this.configService.get<string>(
      'SMTP_FROM',
      'VirtuEx <noreply@virtuex.com>',
    );

    try {
      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      // 이메일 주소 마스킹: 개인정보 보호를 위해 로그에 전체 이메일을 남기지 않음
      // Mask email address: prevents full email from appearing in logs for privacy
      const maskedTo = options.to.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) =>
        `${first}${'*'.repeat(Math.min(middle.length, 3))}${domain}`,
      );
      if (info.message) {
        // Mock transport returns JSON — mask recipient in log
        this.logger.debug(`[MOCK EMAIL] sent to ${maskedTo}`);
      } else {
        this.logger.log(`Email sent to ${maskedTo}: ${info.messageId}`);
      }

      return true;
    } catch (error) {
      const maskedTo = options.to.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) =>
        `${first}${'*'.repeat(Math.min(middle.length, 3))}${domain}`,
      );
      this.logger.error(
        `Failed to send email to ${maskedTo}: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
