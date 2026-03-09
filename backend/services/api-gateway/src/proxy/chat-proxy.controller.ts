/**
 * @file 채팅 프록시 컨트롤러
 * @description API Gateway에서 Chat 서비스로 채팅 요청을 프록시하며,
 *              WebSocket 이벤트(메시지 브로드캐스트, 읽음 처리 등)를 함께 처리합니다
 *
 * @file Chat Proxy Controller
 * @description Proxies chat requests to Chat service and handles
 *              WebSocket events (message broadcast, read receipts, etc.)
 */
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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatGateway } from '../gateway/chat.gateway';

// 모든 채팅 엔드포인트에 JWT 인증 필수 / All chat endpoints require JWT authentication
@ApiTags('Chat')
@ApiBearerAuth()
@Controller('api/chat')
@UseGuards(JwtAuthGuard)
export class ChatProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /** 사용자 검색을 user-auth로 프록시
   * Proxy user search to user-auth */
  // 사용자 검색 (user-auth로 프록시) (User search (proxied to user-auth))
  @Get('users/search')
  @ApiOperation({ summary: '사용자 검색', description: '채팅을 위한 사용자 검색' })
  @ApiResponse({ status: 200, description: '검색 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async searchUsers(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/users/search',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 채팅방 목록 조회를 chat 서비스로 프록시
   * Proxy room list to chat service */
  // 채팅방 목록 (Room list)
  @Get('rooms')
  @ApiOperation({ summary: '채팅방 목록 조회', description: '현재 사용자의 채팅방 목록을 조회합니다' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
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

  /** 채팅방 생성을 chat 서비스로 프록시하고 참여자 소켓 참가 처리
   * Proxy room creation to chat service and join participant sockets */
  // 채팅방 생성 (Create room)
  @Post('rooms')
  @ApiOperation({ summary: '채팅방 생성', description: '새로운 채팅방을 생성합니다' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
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

  /** 채팅방 메시지 조회를 chat 서비스로 프록시
   * Proxy message retrieval to chat service */
  // 메시지 조회 (Get messages)
  @Get('rooms/:id/messages')
  @ApiOperation({ summary: '메시지 조회', description: '채팅방의 메시지 목록을 조회합니다' })
  @ApiParam({ name: 'id', description: '채팅방 ID' })
  @ApiQuery({ name: 'cursor', required: false, description: '커서 (페이지네이션)' })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수 제한' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
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

  /** 메시지 전송을 chat 서비스로 프록시하고 WebSocket 브로드캐스트
   * Proxy message send to chat service and broadcast via WebSocket */
  // 메시지 전송 (Send message)
  @Post('rooms/:id/messages')
  @ApiOperation({ summary: '메시지 전송', description: '채팅방에 메시지를 전송합니다' })
  @ApiParam({ name: 'id', description: '채팅방 ID' })
  @ApiResponse({ status: 201, description: '전송 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
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

  /** 사용자 초대를 chat 서비스로 프록시하고 초대된 사용자 소켓 참가
   * Proxy user invite to chat service and join invited user sockets */
  // 사용자 초대 (Invite users)
  @Post('rooms/:id/invite')
  @ApiOperation({ summary: '사용자 초대', description: '채팅방에 사용자를 초대합니다' })
  @ApiParam({ name: 'id', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '초대 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
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
      const data = (result.data as { data?: { invited?: string[]; systemMessage?: unknown } }).data;
      if (data?.invited) {
        for (const uid of data.invited) {
          this.chatGateway.joinUserToRoom(uid, id);
          this.chatGateway.notifyUser(uid, 'chat:invited', { roomId: id });
        }
      }
      // 시스템 메시지 브로드캐스트 (Broadcast system message)
      if (data?.systemMessage) {
        this.chatGateway.broadcastMessage(id, data.systemMessage);
      }
      this.chatGateway.broadcastParticipantUpdate(id);
    }

    return res.status(result.status).json(result.data);
  }

  /** 사용자 강퇴를 chat 서비스로 프록시 (관리자 전용)
   * Proxy user kick to chat service (admin only) */
  // 사용자 강퇴 (관리자 전용) (Kick user (admin only))
  @Post('rooms/:id/kick')
  @ApiOperation({ summary: '사용자 강퇴', description: '채팅방에서 사용자를 강퇴합니다 (관리자 전용)' })
  @ApiParam({ name: 'id', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '강퇴 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async kickUser(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string; role?: string };
    if (user.role !== 'ADMIN' && user.role !== 'SYSTEM') {
      return res.status(403).json({ success: false, message: 'Forbidden: admin only' });
    }
    const result = await this.proxyService.forward('chat', {
      method: 'POST',
      url: `/rooms/${id}/kick`,
      data: { targetUserId: req.body.targetUserId },
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
      },
    });

    // WebSocket으로 강퇴된 사용자에게 알림 + 시스템 메시지 (Notify kicked user + broadcast system message)
    if (result.status < 400) {
      if (req.body.targetUserId) {
        this.chatGateway.notifyUser(req.body.targetUserId, 'chat:kicked', { roomId: id });
      }
      const data = (result.data as { data?: { systemMessage?: unknown } }).data;
      if (data?.systemMessage) {
        this.chatGateway.broadcastMessage(id, data.systemMessage);
      }
      this.chatGateway.broadcastParticipantUpdate(id);
    }

    return res.status(result.status).json(result.data);
  }

  /** 채팅방 퇴장을 chat 서비스로 프록시하고 시스템 메시지 브로드캐스트
   * Proxy room leave to chat service and broadcast system message */
  // 채팅방 퇴장 (Leave room)
  @Post('rooms/:id/leave')
  @ApiOperation({ summary: '채팅방 퇴장', description: '채팅방에서 퇴장합니다' })
  @ApiParam({ name: 'id', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '퇴장 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
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

    // 시스템 메시지 + 참여자 업데이트 브로드캐스트 (Broadcast system message + participant update)
    if (result.status < 400 && result.data) {
      const data = (result.data as { data?: { systemMessage?: unknown } }).data;
      if (data?.systemMessage) {
        this.chatGateway.broadcastMessage(id, data.systemMessage);
      }
      this.chatGateway.broadcastParticipantUpdate(id);
    }

    return res.status(result.status).json(result.data);
  }

  /** 채팅방 이름 변경을 chat 서비스로 프록시
   * Proxy room rename to chat service */
  // 채팅방 이름 수정 (Rename room)
  @Post('rooms/:id/rename')
  @ApiOperation({ summary: '채팅방 이름 수정', description: '채팅방의 이름을 변경합니다' })
  @ApiParam({ name: 'id', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
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

  /** 채팅방 삭제를 chat 서비스로 프록시 (관리자 전용)
   * Proxy room deletion to chat service (admin only) */
  // 채팅방 삭제 (관리자 전용) (Delete room (admin only))
  @Delete('rooms/:id')
  @ApiOperation({ summary: '채팅방 삭제', description: '채팅방을 삭제합니다 (관리자 전용)' })
  @ApiParam({ name: 'id', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async deleteRoom(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username: string; role?: string };
    if (user.role !== 'ADMIN' && user.role !== 'SYSTEM') {
      return res.status(403).json({ success: false, message: 'Forbidden: admin only' });
    }
    const result = await this.proxyService.forward('chat', {
      method: 'DELETE',
      url: `/rooms/${id}`,
      headers: {
        'x-user-id': user.id,
        'x-user-username': user.username,
        'x-user-role': user.role || '',
      },
    });

    // 채팅방 삭제 알림 (Notify room deletion)
    if (result.status < 400) {
      this.chatGateway.broadcastMessage(id, { type: 'room-deleted', roomId: id });
    }

    return res.status(result.status).json(result.data);
  }

  /** 메시지 삭제를 chat 서비스로 프록시하고 WebSocket 브로드캐스트
   * Proxy message deletion to chat service and broadcast via WebSocket */
  // 메시지 삭제 (Delete message)
  @Delete('rooms/:roomId/messages/:messageId')
  @ApiOperation({ summary: '메시지 삭제', description: '채팅 메시지를 삭제합니다' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiParam({ name: 'messageId', description: '메시지 ID' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
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

  /** 읽음 처리를 chat 서비스로 프록시하고 읽음 확인 브로드캐스트
   * Proxy read receipt to chat service and broadcast read status */
  // 읽음 처리 (Mark as read)
  @Post('rooms/:id/read')
  @ApiOperation({ summary: '읽음 처리', description: '채팅방의 메시지를 읽음으로 표시합니다' })
  @ApiParam({ name: 'id', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '읽음 처리 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
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
