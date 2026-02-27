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
import { AdminProxyController } from './admin-proxy.controller';
import { AnnouncementProxyController } from './announcement-proxy.controller';
import { ProfileProxyController } from './profile-proxy.controller';
import { NotificationProxyController } from './notification-proxy.controller';
import { StatisticsProxyController } from './statistics-proxy.controller';
import { NewsProxyController } from './news-proxy.controller';
import { ChatProxyController } from './chat-proxy.controller';
import { PriceAlertProxyController } from './price-alert-proxy.controller';
import { AiProxyController } from './ai-proxy.controller';
import { ProxyService } from './proxy.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [GatewayModule],
  controllers: [
    AuthProxyController,
    MarketProxyController,
    OrderProxyController,
    PortfolioProxyController,
    AdminProxyController,
    AnnouncementProxyController,
    ProfileProxyController,
    NotificationProxyController,
    StatisticsProxyController,
    NewsProxyController,
    ChatProxyController,
    PriceAlertProxyController,
    AiProxyController,
  ],
  providers: [ProxyService, ConfigService],
  exports: [ProxyService],
})
export class ProxyModule {}
