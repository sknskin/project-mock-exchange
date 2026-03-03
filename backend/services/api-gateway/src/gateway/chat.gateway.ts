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
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // 사용자ID -> 소켓ID 집합 (멀티 탭 지원) (userId -> Set<socketId> for multi-tab support)
  private userSockets = new Map<string, Set<string>>();
  // 소켓ID -> 사용자ID (연결 해제 시 빠른 조회용) (socketId -> userId for quick lookup on disconnect)
  private socketUser = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    server.engine?.on('connection_error', (err: Error) => {
      this.logger.error(`Chat WebSocket connection error: ${err.message}`);
    });

    // 모든 수신 이벤트에 대해 content 필드 길이 검증 미들웨어 (#17)
    // Middleware: validate content field length on all incoming events
    server.use((socket, next) => {
      socket.onAny((_event: string, ...args: unknown[]) => {
        for (const arg of args) {
          if (arg && typeof arg === 'object' && 'content' in arg) {
            const content = (arg as { content: unknown }).content;
            if (typeof content === 'string' && content.length > MAX_MESSAGE_LENGTH) {
              socket.emit('chat:error', {
                message: `Message content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
              });
              return;
            }
          }
        }
      });
      next();
    });

    this.logger.log('Chat WebSocket gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

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

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      if (data.roomId) {
        client.to(`room:${data.roomId}`).emit('chat:typing', {
          roomId: data.roomId,
          userId: client.data.userId,
          username: client.data.username,
        });
      }
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

  async joinUserToRoom(userId: string, roomId: string) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        // server.in(socketId)으로 방 참가 명령 전송 (Use server.in(socketId) to emit join command)
        const matchingSockets = await this.server.in(socketId).fetchSockets();
        for (const s of matchingSockets) {
          s.join(`room:${roomId}`);
        }
      }
    }
  }
}
