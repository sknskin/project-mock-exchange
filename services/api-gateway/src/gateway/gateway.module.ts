import { Module } from '@nestjs/common';
import { PriceGateway } from './price.gateway';
import { PriceSubscriberService } from './price-subscriber.service';

@Module({
  providers: [PriceGateway, PriceSubscriberService],
})
export class GatewayModule {}
