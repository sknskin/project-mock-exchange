/**
 * @file WebSocket 게이트웨이 모듈
 * @description 실시간 가격 스트리밍을 위한 WebSocket 게이트웨이 모듈
 *
 * @file WebSocket Gateway Module
 * @description WebSocket gateway module for real-time price streaming
 */
import { Module } from '@nestjs/common';
import { PriceGateway } from './price.gateway';
import { PriceSubscriberService } from './price-subscriber.service';

@Module({
  providers: [PriceGateway, PriceSubscriberService],
})
export class GatewayModule {}
