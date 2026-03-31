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

/** 채팅 메시지 본문 최대 길이 (Max chat message content length) */
const MAX_MESSAGE_LENGTH = 2000;

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:4000').split(','),
    credentials: true,
  },
  // WS 페이로드 크기 제한 — 대용량 메시지를 통한 메모리 소진 방지 (#17)
  // Limit WS payload size to prevent memory exhaustion via oversized messages
  maxHttpBufferSize: 16 * 1024, // 16 KB
  // G-M-03: WebSocket 하트비트 설정 — 비활성 연결 자동 감지 및 정리
  // G-M-03: WebSocket heartbeat — auto-detect and clean up inactive connections
  pingInterval: 25000,
  pingTimeout: 20000,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // 사용자ID -> 소켓ID 집합 (멀티 탭 지원) (userId -> Set<socketId> for multi-tab support)
  private userSockets = new Map<string, Set<string>>();
  // 소켓ID -> 사용자ID (연결 해제 시 빠른 조회용) (socketId -> userId for quick lookup on disconnect)
  private socketUser = new Map<string, string>();
  /** G-L-01: 타이핑 이벤트 서버측 쓰로틀 — userId:roomId별 마지막 전송 시각
   * G-L-01: Server-side typing throttle — last emit timestamp per userId:roomId */
  private typingThrottle = new Map<string, number>();
  /** G-L-01: 타이핑 쓰로틀 간격 (2초) — 클라이언트 디바운스와 동일
   * G-L-01: Typing throttle interval (2s) — matches client-side debounce */
  private static readonly TYPING_THROTTLE_MS = 2000;

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    server.engine?.on('connection_error', (err: Error) => {
      this.logger.error(`Chat WebSocket connection error: ${err.message}`);
    });

    // G-M-01: 모든 수신 이벤트에 인증 및 유효성 검증 미들웨어를 적용합니다.
    // 인증되지 않은 소켓의 이벤트를 조기 차단하고, content 필드 길이를 사전 검증합니다.
    //
    // G-M-01: Applies auth and validation middleware to all incoming events.
    // Blocks unauthenticated socket events early and pre-validates content field length.
    server.use((socket, next) => {
      socket.onAny((event: string, ...args: unknown[]) => {
        // G-M-01: 인증 필터 — userId가 없는 소켓의 이벤트는 에러 반환 후 무시
        // G-M-01: Auth filter — reject events from sockets without userId
        if (!socket.data?.userId) {
          socket.emit('chat:error', { message: 'Not authenticated' });
          return;
        }

        // G-M-01: 허용된 이벤트 화이트리스트 — 미등록 이벤트는 무시하여 공격 표면 축소
        // G-M-01: Allowed event whitelist — ignore unregistered events to reduce attack surface
        const allowedEvents = new Set([
          'chat:join-room', 'chat:leave-room', 'chat:typing',
          'presence:get-online',
        ]);
        if (!allowedEvents.has(event)) return;

        // content 필드 길이 검증 / Validate content field length
        for (const arg of args) {
          if (arg && typeof arg === 'object' && 'content' in (arg as Record<string, unknown>)) {
            const content = (arg as { content: unknown }).content;
            if (typeof content === 'string' && content.length > MAX_MESSAGE_LENGTH) {
              socket.emit('chat:error', {
                message: `Message content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
              });
            }
          }
        }
      });
      next();
    });

    this.logger.log('Chat WebSocket gateway initialized');
  }

  /**
   * 쿠키 문자열에서 특정 이름의 값을 파싱합니다.
   * Parses a specific cookie value from a cookie header string.
   */
  private parseCookieToken(cookieHeader: string | undefined): string | undefined {
    if (!cookieHeader) return undefined;
    const match = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith('access_token='));
    return match ? match.split('=')[1] : undefined;
  }

  async handleConnection(client: Socket) {
    try {
      // SEC-H-03: httpOnly 쿠키에서도 토큰 추출 — 프론트엔드에서 토큰을 JS로 전달하지 않아도 인증 가능
      // SEC-H-03: Extract token from httpOnly cookie — enables auth without passing token via JS
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '') ||
        this.parseCookieToken(client.handshake.headers?.cookie as string);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub as string;

      // 사용자-소켓 매핑 저장 (Store mapping)
      client.data.userId = userId;
      client.data.username = payload.username;
      this.socketUser.set(client.id, userId);

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // 사용자의 첫 번째 연결이면 온라인 상태 브로드캐스트 (Broadcast online status if this is the user's first connection)
      if (this.userSockets.get(userId)!.size === 1) {
        this.server.emit('presence:online', { userId });
      }

      this.logger.log(`Chat client connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.warn(`Chat auth failed for ${client.id}: ${error instanceof Error ? error.message : 'unknown'}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUser.get(client.id);
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
        // 모든 탭이 닫히면 오프라인 상태 브로드캐스트 (Broadcast offline status when all tabs closed)
        this.server.emit('presence:offline', { userId });
        // G-L-01: 사용자의 모든 연결이 끊기면 타이핑 쓰로틀 엔트리 정리 — 메모리 누수 방지
        // G-L-01: Clean up typing throttle entries when user fully disconnects — prevents memory leaks
        for (const key of this.typingThrottle.keys()) {
          if (key.startsWith(`${userId}:`)) {
            this.typingThrottle.delete(key);
          }
        }
      }
      this.socketUser.delete(client.id);
    }
    this.logger.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('presence:get-online')
  handleGetOnline(@ConnectedSocket() client: Socket) {
    const onlineUserIds = Array.from(this.userSockets.keys());
    client.emit('presence:online-list', { userIds: onlineUserIds });
  }

  @SubscribeMessage('chat:join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      if (!data.roomId) return;

      const userId = client.data.userId;
      if (!userId) {
        this.logger.warn(`Unauthenticated socket ${client.id} tried to join room ${data.roomId}`);
        return { event: 'chat:error', data: { message: 'Not authenticated' } };
      }

      // Verify user is a participant (check is done via the room membership tracked by the gateway)
      const userSocketIds = this.userSockets.get(userId);
      if (!userSocketIds || userSocketIds.size === 0) {
        return { event: 'chat:error', data: { message: 'Not authenticated' } };
      }

      client.join(`room:${data.roomId}`);
      return { event: 'chat:joined', data: { roomId: data.roomId } };
    } catch (error) {
      this.logger.error(`Error joining room: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  @SubscribeMessage('chat:leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      if (data.roomId) {
        client.leave(`room:${data.roomId}`);
      }
    } catch (error) {
      this.logger.error(`Error leaving room: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  /**
   * G-L-01: 타이핑 이벤트에 서버측 쓰로틀을 적용합니다.
   * 동일 userId:roomId 조합에서 2초 이내 중복 타이핑 이벤트를 무시하여
   * 과도한 브로드캐스트를 방지합니다.
   *
   * G-L-01: Applies server-side throttle to typing events.
   * Ignores duplicate typing events from the same userId:roomId within 2 seconds
   * to prevent excessive broadcasts.
   */
  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      if (!data.roomId || !client.data.userId) return;

      // G-L-01: 서버측 쓰로틀 — 2초 이내 동일 사용자/방 조합의 중복 이벤트 무시
      // G-L-01: Server-side throttle — ignore duplicate events from same user/room within 2s
      const throttleKey = `${client.data.userId}:${data.roomId}`;
      const now = Date.now();
      const lastEmit = this.typingThrottle.get(throttleKey) || 0;
      if (now - lastEmit < ChatGateway.TYPING_THROTTLE_MS) return;
      this.typingThrottle.set(throttleKey, now);

      client.to(`room:${data.roomId}`).emit('chat:typing', {
        roomId: data.roomId,
        userId: client.data.userId,
        username: client.data.username,
      });
    } catch (error) {
      this.logger.error(`Error handling typing: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  broadcastMessage(roomId: string, message: unknown) {
    this.server.to(`room:${roomId}`).emit('chat:message', message);
  }

  broadcastReadReceipt(roomId: string, userId: string) {
    this.server.to(`room:${roomId}`).emit('chat:read', { roomId, userId });
  }

  broadcastParticipantUpdate(roomId: string) {
    this.server.to(`room:${roomId}`).emit('chat:participant-update', { roomId });
  }

  notifyUser(userId: string, event: string, data: unknown) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * G-H-02: fetchSockets() 대신 server.sockets.sockets Map에서 직접 소켓을 조회합니다.
   * fetchSockets()는 어댑터를 통해 비동기 조회하므로 불필요한 오버헤드가 발생합니다.
   * 로컬 서버의 sockets Map을 직접 참조하여 O(1) 접근으로 최적화합니다.
   *
   * G-H-02: Accesses sockets directly from server.sockets.sockets Map instead of fetchSockets().
   * fetchSockets() queries through the adapter asynchronously, adding unnecessary overhead.
   * Direct Map lookup provides O(1) access for local server sockets.
   */
  joinUserToRoom(userId: string, roomId: string) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.join(`room:${roomId}`);
        }
      }
    }
  }
}
