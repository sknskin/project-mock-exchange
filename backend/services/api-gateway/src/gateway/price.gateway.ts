/**
 * @file 가격 WebSocket 게이트웨이
 * @description Socket.IO 기반 실시간 가격 스트리밍 게이트웨이
 *
 * @file Price WebSocket Gateway
 * @description Socket.IO-based real-time price streaming gateway
 */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/prices',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4000',
    credentials: true,
  },
})
export class PriceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PriceGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ) {
    if (data.channel) {
      client.join(data.channel);
      this.logger.debug(`Client ${client.id} subscribed to ${data.channel}`);
      return { event: 'subscribed', data: { channel: data.channel } };
    }
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ) {
    if (data.channel) {
      client.leave(data.channel);
      this.logger.debug(`Client ${client.id} unsubscribed from ${data.channel}`);
      return { event: 'unsubscribed', data: { channel: data.channel } };
    }
  }

  broadcastPrice(symbol: string, priceData: unknown) {
    this.server.to(`prices:${symbol}`).emit('price:update', {
      channel: `prices:${symbol}`,
      data: priceData,
      timestamp: Date.now(),
    });
  }
}
