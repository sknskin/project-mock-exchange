import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatGateway } from '../gateway/chat.gateway';

@Controller('api/chat')
@UseGuards(JwtAuthGuard)
export class ChatProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly chatGateway: ChatGateway,
  ) {}

  // User search (proxied to user-auth)
  @Get('users/search')
  async searchUsers(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/users/search',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  // Room list
  @Get('rooms')
  async getRooms(@Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string };
    const result = await this.proxyService.forward('chat', {
      method: 'GET',
      url: '/rooms',
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
      },
    });
    return res.status(result.status).json(result.data);
  }

  // Create room
  @Post('rooms')
  async createRoom(@Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string };
    const { participantIds } = req.body;

    // The frontend sends participantUsernames along with the request
    let participantUsernames: Record<string, string> = {};
    if (participantIds?.length > 0 && req.body.participantUsernames) {
      participantUsernames = req.body.participantUsernames;
    }

    const result = await this.proxyService.forward('chat', {
      method: 'POST',
      url: '/rooms',
      data: {
        type: req.body.type,
        name: req.body.name,
        participantIds: req.body.participantIds,
      },
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
        'x-participant-usernames': JSON.stringify(participantUsernames),
      },
    });

    // Join all participants' sockets to the room
    if (result.status < 400 && result.data) {
      const roomData = (result.data as { data?: { id?: string; participants?: { userId: string }[] } }).data;
      if (roomData?.id) {
        const roomId = roomData.id;
        // Join creator
        this.chatGateway.joinUserToRoom(user.id, roomId);
        // Join other participants and notify
        if (roomData.participants) {
          for (const p of roomData.participants) {
            if (p.userId !== user.id) {
              this.chatGateway.joinUserToRoom(p.userId, roomId);
              this.chatGateway.notifyUser(p.userId, 'chat:room-created', roomData);
            }
          }
        }
      }
    }

    return res.status(result.status).json(result.data);
  }

  // Get messages
  @Get('rooms/:id/messages')
  async getMessages(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string };
    const result = await this.proxyService.forward('chat', {
      method: 'GET',
      url: `/rooms/${id}/messages`,
      params: req.query,
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
      },
    });
    return res.status(result.status).json(result.data);
  }

  // Send message
  @Post('rooms/:id/messages')
  async sendMessage(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string };
    const result = await this.proxyService.forward('chat', {
      method: 'POST',
      url: `/rooms/${id}/messages`,
      data: req.body,
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
      },
    });

    // Broadcast message via WebSocket
    if (result.status < 400 && result.data) {
      const messageData = (result.data as { data?: unknown }).data;
      this.chatGateway.broadcastMessage(id, messageData);

      // Create notification for offline participants
      this.notifyOfflineParticipants(id, user, req);
    }

    return res.status(result.status).json(result.data);
  }

  // Invite users
  @Post('rooms/:id/invite')
  async inviteUsers(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string };

    const inviteUsernames: Record<string, string> = req.body.usernames || {};

    const result = await this.proxyService.forward('chat', {
      method: 'POST',
      url: `/rooms/${id}/invite`,
      data: { userIds: req.body.userIds },
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
        'x-invite-usernames': JSON.stringify(inviteUsernames),
      },
    });

    // Join invited users' sockets and notify
    if (result.status < 400 && result.data) {
      const data = (result.data as { data?: { invited?: string[] } }).data;
      if (data?.invited) {
        for (const uid of data.invited) {
          this.chatGateway.joinUserToRoom(uid, id);
          this.chatGateway.notifyUser(uid, 'chat:invited', { roomId: id });
        }
      }
    }

    return res.status(result.status).json(result.data);
  }

  // Leave room
  @Post('rooms/:id/leave')
  async leaveRoom(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string };
    const result = await this.proxyService.forward('chat', {
      method: 'POST',
      url: `/rooms/${id}/leave`,
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
      },
    });
    return res.status(result.status).json(result.data);
  }

  // Mark as read
  @Post('rooms/:id/read')
  async markAsRead(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string };
    const result = await this.proxyService.forward('chat', {
      method: 'POST',
      url: `/rooms/${id}/read`,
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
      },
    });

    if (result.status < 400) {
      this.chatGateway.broadcastReadReceipt(id, user.id);
    }

    return res.status(result.status).json(result.data);
  }

  private async notifyOfflineParticipants(
    roomId: string,
    sender: { id: string; username: string },
    req: Request,
  ) {
    try {
      // Get room list (contains participants) from chat service
      const roomResult = await this.proxyService.forward('chat', {
        method: 'GET',
        url: '/rooms',
        headers: {
          'x-user-id': sender.id,
          'x-user-username': sender.username,
        },
      });

      const rooms = (roomResult.data as { data?: { id: string; name?: string; type: string; participants: { userId: string; username: string }[] }[] }).data || [];
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;

      const roomLabel = room.type === 'GROUP'
        ? room.name || room.participants.map((p) => p.username).join(', ')
        : undefined;

      for (const p of room.participants) {
        if (p.userId === sender.id) continue;
        if (this.chatGateway.isUserOnline(p.userId)) continue;

        const title = roomLabel
          ? `${sender.username} (${roomLabel})`
          : `${sender.username}`;

        // Create notification for offline user
        await this.proxyService.forward('user-auth', {
          method: 'POST',
          url: '/notifications',
          data: {
            userId: p.userId,
            type: 'CHAT_MESSAGE',
            title,
            message: req.body.content?.substring(0, 100) || '',
            link: `chat:${roomId}`,
          },
          headers: { Authorization: req.headers.authorization || '' },
        }).catch(() => {
          // Notification creation is best-effort
        });
      }
    } catch {
      // Notification is best-effort, don't fail the message send
    }
  }
}
