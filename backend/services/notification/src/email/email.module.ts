/**
 * @file 이메일 모듈
 * @description 이메일 서비스와 컨트롤러를 등록합니다
 *
 * @file Email Module
 * @description Registers email service and controller
 */
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';

@Module({
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
