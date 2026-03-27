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
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

/** 인증되지 않은 클라이언트당 최대 구독 채널 수 (Max subscriptions per unauthenticated client) */
const MAX_ANON_SUBSCRIPTIONS = 5;
/** 인증된 클라이언트당 최대 구독 채널 수 (Max subscriptions per authenticated client) */
const MAX_AUTH_SUBSCRIPTIONS = 300;
/** IP당 최대 익명 연결 수 (Max anonymous connections per IP) */
const MAX_ANON_CONNECTIONS_PER_IP = 10;

@WebSocketGateway({
  namespace: '/prices',
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:4000').split(','),
    credentials: true,
  },
})
export class PriceGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PriceGateway.name);
  /** 클라이언트별 구독 채널 수 추적 (Track subscription count per client) */
  private clientSubscriptions = new Map<string, number>();
  /** IP별 익명 연결 수 추적 (Track anonymous connection count per IP) */
  private anonConnectionsByIp = new Map<string, number>();

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    server.engine?.on('connection_error', (err: Error) => {
      this.logger.error(`Price WebSocket connection error: ${err.message}`);
    });
    this.logger.log('Price WebSocket gateway initialized');
  }

  async handleConnection(client: Socket) {
    const clientIp = client.handshake.address || 'unknown';

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
        // IP별 익명 연결 수 제한 — 리소스 소진 방지 / Limit anonymous connections per IP
        const anonCount = this.anonConnectionsByIp.get(clientIp) || 0;
        if (anonCount >= MAX_ANON_CONNECTIONS_PER_IP) {
          this.logger.warn(`Anonymous connection limit exceeded for IP ${clientIp}, disconnecting ${client.id}`);
          client.disconnect(true);
          return;
        }
        this.anonConnectionsByIp.set(clientIp, anonCount + 1);
        client.data.authenticated = false;
        client.data.clientIp = clientIp;
        this.logger.log(`Anonymous client connected: ${client.id}`);
      }
    } catch {
      const anonCount = this.anonConnectionsByIp.get(clientIp) || 0;
      if (anonCount >= MAX_ANON_CONNECTIONS_PER_IP) {
        client.disconnect(true);
        return;
      }
      this.anonConnectionsByIp.set(clientIp, anonCount + 1);
      client.data.authenticated = false;
      client.data.clientIp = clientIp;
      this.logger.warn(`Client ${client.id} provided invalid token, treating as anonymous`);
    }

    this.clientSubscriptions.set(client.id, 0);
  }

  handleDisconnect(client: Socket) {
    this.clientSubscriptions.delete(client.id);
    // 익명 연결 카운트 감소 / Decrement anonymous connection count
    if (!client.data.authenticated && client.data.clientIp) {
      const ip = client.data.clientIp as string;
      const count = this.anonConnectionsByIp.get(ip) || 1;
      if (count <= 1) {
        this.anonConnectionsByIp.delete(ip);
      } else {
        this.anonConnectionsByIp.set(ip, count - 1);
      }
    }
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
      this.logger.log(`Client ${client.id} subscribed to ${subscribed.length} symbols`);
      this.broadcastCount = 20; // BC-POST 로그 트리거
      return { event: 'subscribed', data: { channels: subscribed } };
    }
  }

  private canSubscribe(client: Socket): boolean {
    const count = this.clientSubscriptions.get(client.id) || 0;
    if (client.data.authenticated) return count < MAX_AUTH_SUBSCRIPTIONS;
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

  /** 클라이언트 하트비트 ping에 pong 응답 — 연결 유지용
   * Respond to client heartbeat ping with pong — keeps connection alive */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong');
  }

  broadcastPrice(symbol: string, priceData: unknown) {
    const room = `prices:${symbol}`;
    const sockets = this.server.in(room).fetchSockets();
    // 디버그: 첫 5번만 로그 — Room에 실제로 소켓이 있는지 확인
    // Debug: log first 5 times — verify sockets are in the room
    // subscribe 이후에만 로그 (broadcastCount >= 20이면 subscribe 이후)
    if (this.broadcastCount >= 20 && this.broadcastCount < 25) {
      sockets.then((s) => this.logger.log(`[BC-POST] ${symbol} → ${room}: ${s.length} clients`));
      this.broadcastCount++;
    } else if (this.broadcastCount < 20) {
      this.broadcastCount++;
    }
    this.server.to(room).emit('price:update', {
      channel: room,
      data: priceData,
      timestamp: Date.now(),
    });
  }
  private broadcastCount = 0;

  /**
   * G-H-01: 여러 심볼의 가격 업데이트를 단일 이벤트로 일괄 전송합니다.
   * 클라이언트가 'price:batch' 이벤트를 구독하면 N개의 개별 이벤트 대신
   * 1개의 배치 이벤트로 수신하여 네트워크 오버헤드를 줄일 수 있습니다.
   *
   * G-H-01: Broadcasts multiple symbol price updates in a single event.
   * Clients subscribing to 'price:batch' receive 1 batched event instead of N individual ones,
   * reducing network overhead.
   */
  broadcastPriceBatch(updates: { symbol: string; data: unknown }[]) {
    if (updates.length === 0) return;
    this.server.emit('price:batch', {
      updates: updates.map((u) => ({
        channel: `prices:${u.symbol}`,
        data: u.data,
      })),
      timestamp: Date.now(),
    });
  }
}
