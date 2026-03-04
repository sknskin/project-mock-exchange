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
import { SettingsProxyController } from './settings-proxy.controller';
import { UserSettingsProxyController } from './user-settings-proxy.controller';
import { CommunityProxyController } from './community-proxy.controller';
import { ProxyService } from './proxy.service';
import { GatewayModule } from '../gateway/gateway.module';

/**
 * 모든 프록시 컨트롤러를 단일 모듈로 통합합니다.
 * GatewayModule을 임포트하여 WebSocket 알림(ChatGateway)을 프록시 컨트롤러에서 사용 가능하게 합니다.
 *
 * Consolidates all proxy controllers into a single module.
 * Imports GatewayModule to make WebSocket notifications (ChatGateway) available to proxy controllers.
 */
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
    SettingsProxyController,
    UserSettingsProxyController,
    CommunityProxyController,
  ],
  // ProxyService: 마이크로서비스 프록시 + Circuit Breaker / Microservice proxy with Circuit Breaker
  // ConfigService: 환경변수 접근용 / For accessing environment variables
  providers: [ProxyService, ConfigService],
  exports: [ProxyService],
})
export class ProxyModule {}
