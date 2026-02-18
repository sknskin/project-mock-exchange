/**
 * @file Portfolio Prisma 모듈
 * @description Portfolio 서비스의 Prisma DB 접근을 제공하는 글로벌 모듈
 *
 * @file Portfolio Prisma Module
 * @description Global module providing Prisma DB access for Portfolio service
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
