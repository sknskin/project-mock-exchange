/**
 * @file 가격 WebSocket 게이트웨이
 * @description Socket.IO 기반 실시간 가격 스트리밍 게이트웨이 (JWT 인증 지원)
 *
 * @file Price WebSocket Gateway
 * @description Socket.IO-based real-time price streaming gateway with JWT authentication
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
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

/** 인증되지 않은 클라이언트당 최대 구독 채널 수 (Max subscriptions per unauthenticated client) */
const MAX_ANON_SUBSCRIPTIONS = 5;

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
  /** 클라이언트별 구독 채널 수 추적 (Track subscription count per client) */
  private clientSubscriptions = new Map<string, number>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (token) {
        const payload = await this.jwtService.verifyAsync(token);
        client.data.userId = payload.sub;
        client.data.authenticated = true;
        this.logger.log(`Authenticated client connected: ${client.id} (user: ${payload.sub})`);
      } else {
        client.data.authenticated = false;
        this.logger.log(`Anonymous client connected: ${client.id}`);
      }
    } catch {
      // 토큰이 유효하지 않으면 익명 클라이언트로 처리 (Invalid token → treat as anonymous)
      client.data.authenticated = false;
      this.logger.warn(`Client ${client.id} provided invalid token, treating as anonymous`);
    }

    this.clientSubscriptions.set(client.id, 0);
  }

  handleDisconnect(client: Socket) {
    this.clientSubscriptions.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel?: string; symbols?: string[] },
  ) {
    // 단일 채널 구독 (Single channel subscription)
    if (data.channel) {
      if (!this.canSubscribe(client)) {
        return { event: 'error', data: { message: 'Subscription limit reached. Please sign in for unlimited access.' } };
      }
      client.join(data.channel);
      this.clientSubscriptions.set(client.id, (this.clientSubscriptions.get(client.id) || 0) + 1);
      this.logger.debug(`Client ${client.id} subscribed to ${data.channel}`);
      return { event: 'subscribed', data: { channel: data.channel } };
    }

    // 다중 심볼 구독 (Multiple symbol subscription)
    if (data.symbols && Array.isArray(data.symbols)) {
      const subscribed: string[] = [];
      for (const symbol of data.symbols) {
        const channel = `prices:${symbol}`;
        if (!this.canSubscribe(client)) break;
        client.join(channel);
        this.clientSubscriptions.set(client.id, (this.clientSubscriptions.get(client.id) || 0) + 1);
        subscribed.push(channel);
      }
      return { event: 'subscribed', data: { channels: subscribed } };
    }
  }

  private canSubscribe(client: Socket): boolean {
    if (client.data.authenticated) return true;
    const count = this.clientSubscriptions.get(client.id) || 0;
    return count < MAX_ANON_SUBSCRIPTIONS;
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
