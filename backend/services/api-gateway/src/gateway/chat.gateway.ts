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

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // userId -> Set<socketId> for multi-tab support
  private userSockets = new Map<string, Set<string>>();
  // socketId -> userId for quick lookup on disconnect
  private socketUser = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) {}

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

      // Store mapping
      client.data.userId = userId;
      client.data.username = payload.username;
      this.socketUser.set(client.id, userId);

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`Chat client connected: ${client.id} (user: ${userId})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUser.get(client.id);
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
      this.socketUser.delete(client.id);
    }
    this.logger.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    if (data.roomId) {
      client.join(`room:${data.roomId}`);
      return { event: 'chat:joined', data: { roomId: data.roomId } };
    }
  }

  @SubscribeMessage('chat:leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    if (data.roomId) {
      client.leave(`room:${data.roomId}`);
    }
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    if (data.roomId) {
      client.to(`room:${data.roomId}`).emit('chat:typing', {
        roomId: data.roomId,
        userId: client.data.userId,
        username: client.data.username,
      });
    }
  }

  broadcastMessage(roomId: string, message: unknown) {
    this.server.to(`room:${roomId}`).emit('chat:message', message);
  }

  broadcastReadReceipt(roomId: string, userId: string) {
    this.server.to(`room:${roomId}`).emit('chat:read', { roomId, userId });
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

  async joinUserToRoom(userId: string, roomId: string) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        // Use server.in(socketId) to emit join command
        const matchingSockets = await this.server.in(socketId).fetchSockets();
        for (const s of matchingSockets) {
          s.join(`room:${roomId}`);
        }
      }
    }
  }
}
