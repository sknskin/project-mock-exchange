import {
  Controller,
  Get,
  Post,
  Delete,
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

  // 사용자 검색 (user-auth로 프록시) (User search (proxied to user-auth))
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

  // 채팅방 목록 (Room list)
  @Get('rooms')
  async getRooms(@Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string; name?: string };
    const result = await this.proxyService.forward('chat', {
      method: 'GET',
      url: '/rooms',
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  // 채팅방 생성 (Create room)
  @Post('rooms')
  async createRoom(@Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string; name?: string };
    const { participantIds } = req.body;

    // 프론트엔드가 요청과 함께 참여자 사용자명/이름을 전송 (The frontend sends participantUsernames/Names along with the request)
    let participantUsernames: Record<string, string> = {};
    let participantNames: Record<string, string> = {};
    if (participantIds?.length > 0) {
      if (req.body.participantUsernames) participantUsernames = req.body.participantUsernames;
      if (req.body.participantNames) participantNames = req.body.participantNames;
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
        'x-user-name': encodeURIComponent(user.name || ''),
        'x-participant-usernames': encodeURIComponent(JSON.stringify(participantUsernames)),
        'x-participant-names': encodeURIComponent(JSON.stringify(participantNames)),
      },
    });

    // 모든 참여자의 소켓을 채팅방에 참가시킴 (Join all participants' sockets to the room)
    if (result.status < 400 && result.data) {
      const roomData = (result.data as { data?: { id?: string; participants?: { userId: string }[] } }).data;
      if (roomData?.id) {
        const roomId = roomData.id;
        // 생성자 참가 (Join creator)
        this.chatGateway.joinUserToRoom(user.id, roomId);
        // 다른 참여자 참가 및 알림 전송 (Join other participants and notify)
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

  // 메시지 조회 (Get messages)
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

  // 메시지 전송 (Send message)
  @Post('rooms/:id/messages')
  async sendMessage(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string; name?: string; role?: string };
    const result = await this.proxyService.forward('chat', {
      method: 'POST',
      url: `/rooms/${id}/messages`,
      data: req.body,
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
        'x-user-name': encodeURIComponent(user.name || ''),
        'x-user-role': user.role || '',
      },
    });

    // WebSocket으로 메시지 브로드캐스트 (Broadcast message via WebSocket)
    if (result.status < 400 && result.data) {
      const messageData = (result.data as { data?: unknown }).data;
      this.chatGateway.broadcastMessage(id, messageData);
    }

    return res.status(result.status).json(result.data);
  }

  // 사용자 초대 (Invite users)
  @Post('rooms/:id/invite')
  async inviteUsers(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string; name?: string };

    const inviteUsernames: Record<string, string> = req.body.usernames || {};
    const inviteNames: Record<string, string> = req.body.names || {};

    const result = await this.proxyService.forward('chat', {
      method: 'POST',
      url: `/rooms/${id}/invite`,
      data: { userIds: req.body.userIds },
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
        'x-invite-usernames': encodeURIComponent(JSON.stringify(inviteUsernames)),
        'x-invite-names': encodeURIComponent(JSON.stringify(inviteNames)),
      },
    });

    // 초대된 사용자의 소켓 참가 및 알림 전송 (Join invited users' sockets and notify)
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

  // 사용자 강퇴 (관리자 전용) (Kick user (admin only))
  @Post('rooms/:id/kick')
  async kickUser(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string; role?: string };
    const result = await this.proxyService.forward('chat', {
      method: 'POST',
      url: `/rooms/${id}/kick`,
      data: { targetUserId: req.body.targetUserId },
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
      },
    });

    // WebSocket으로 강퇴된 사용자에게 알림 (Notify kicked user via WebSocket)
    if (result.status < 400 && req.body.targetUserId) {
      this.chatGateway.notifyUser(req.body.targetUserId, 'chat:kicked', { roomId: id });
    }

    return res.status(result.status).json(result.data);
  }

  // 채팅방 퇴장 (Leave room)
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

  // 채팅방 이름 수정 (Rename room)
  @Post('rooms/:id/rename')
  async renameRoom(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string };
    const result = await this.proxyService.forward('chat', {
      method: 'POST',
      url: `/rooms/${id}/rename`,
      data: { name: req.body.name },
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
      },
    });
    return res.status(result.status).json(result.data);
  }

  // 메시지 삭제 (Delete message)
  @Delete('rooms/:roomId/messages/:messageId')
  async deleteMessage(
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { id: string; username: string; role?: string };
    const result = await this.proxyService.forward('chat', {
      method: 'DELETE',
      url: `/rooms/${roomId}/messages/${messageId}`,
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
        'x-user-role': user.role || '',
      },
    });

    // WebSocket으로 메시지 삭제 브로드캐스트 (Broadcast message deletion via WebSocket)
    if (result.status < 400) {
      this.chatGateway.broadcastMessage(roomId, {
        type: 'message-deleted',
        messageId,
        roomId,
      });
    }

    return res.status(result.status).json(result.data);
  }

  // 읽음 처리 (Mark as read)
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
}
