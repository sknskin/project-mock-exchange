/**
 * @file 프록시 모듈
 * @description 마이크로서비스로의 HTTP 프록시 컨트롤러들을 등록합니다
 *
 * @file Proxy Module
 * @description Registers HTTP proxy controllers for microservice forwarding
 */
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProxyController } from './auth-proxy.controller';
import { MarketProxyController } from './market-proxy.controller';
import { OrderProxyController } from './order-proxy.controller';
import { PortfolioProxyController } from './portfolio-proxy.controller';
import { ProxyService } from './proxy.service';

@Module({
  controllers: [
    AuthProxyController,
    MarketProxyController,
    OrderProxyController,
    PortfolioProxyController,
  ],
  providers: [ProxyService, ConfigService],
  exports: [ProxyService],
})
export class ProxyModule {}
