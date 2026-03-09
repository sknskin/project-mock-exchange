/**
 * @file 채팅 컨트롤러
 * @description 채팅방 CRUD, 메시지 송수신, 참여자 관리, 읽음 확인, 통계 API
 *
 * @file Chat Controller
 * @description Chat room CRUD, messaging, participant management, read receipts, statistics API
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RenameRoomDto } from './dto/rename-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { InternalAuthGuard } from '../common/guards/internal-auth.guard';

// InternalAuthGuard: API Gateway만 접근 가능 (x-internal-token 검증)
// InternalAuthGuard: Only API Gateway can access (validates x-internal-token)
@UseGuards(InternalAuthGuard)
@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** 채팅 통계 조회 (기간별 메시지 수, 활성 사용자 등)
   * Get chat statistics (message counts, active users, etc.) */
  @Get('statistics')
  async statistics(@Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number) {
    const data = await this.chatService.getStatistics(days);
    return { success: true, data };
  }

  /** 사용자가 참여 중인 채팅방 목록 조회
   * Get list of rooms the user participates in */
  @Get('rooms')
  async getRooms(@Headers('x-user-id') userId: string) {
    const rooms = await this.chatService.getRooms(userId);
    return { success: true, data: rooms };
  }

  /** 새 채팅방 생성 (DM 또는 그룹)
   * Create a new chat room (DM or GROUP) */
  @Post('rooms')
  async createRoom(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-username') username: string,
    @Headers('x-user-name') name: string,
    @Body() dto: CreateRoomDto,
    @Headers('x-participant-usernames') participantUsernamesHeader?: string,
    @Headers('x-participant-names') participantNamesHeader?: string,
  ) {
    // 헤더에서 URI-인코딩된 한국어 이름 디코딩 (100자 제한) / Decode URI-encoded Korean name from header (max 100 chars)
    let decodedName = '';
    try { decodedName = name ? decodeURIComponent(name).slice(0, 100) : ''; } catch { decodedName = ''; }
    // API Gateway에서 JSON으로 전달된 참여자 정보 파싱 / Parse participant info passed as JSON from API Gateway
    let participantUsernames: Record<string, string> = {};
    let participantNames: Record<string, string> = {};
    if (participantUsernamesHeader) {
      try { participantUsernames = JSON.parse(decodeURIComponent(participantUsernamesHeader)); } catch { /* ignore */ }
    }
    if (participantNamesHeader) {
      try { participantNames = JSON.parse(decodeURIComponent(participantNamesHeader)); } catch { /* ignore */ }
    }
    const room = await this.chatService.createRoomWithUsernames(
      userId,
      username,
      dto,
      participantUsernames,
      decodedName,
      participantNames,
    );
    return { success: true, data: room };
  }

  /** 채팅방의 메시지 목록을 커서 기반 페이징으로 조회
   * Get paginated messages in a room using cursor-based pagination */
  @Get('rooms/:id/messages')
  async getMessages(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
  ) {
    // 페이지네이션 최대값 제한 — 메모리 소진 방지 / Cap pagination limit to prevent memory exhaustion
    const safeLimit = Math.min(Math.max(1, limit ?? 30), 100);
    const result = await this.chatService.getMessages(roomId, userId, cursor, safeLimit);
    return { success: true, data: result };
  }

  /** 채팅방에 메시지 전송
   * Send a message to a chat room */
  @Post('rooms/:id/messages')
  async sendMessage(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-username') username: string,
    @Headers('x-user-name') name: string,
    @Headers('x-user-role') role: string,
    @Body() dto: SendMessageDto,
  ) {
    let decodedName = '';
    try { decodedName = name ? decodeURIComponent(name).slice(0, 100) : ''; } catch { decodedName = ''; }
    const message = await this.chatService.sendMessage(roomId, userId, username, dto, decodedName, role);
    return { success: true, data: message };
  }

  /** 채팅방에 사용자 초대
   * Invite users to a chat room */
  @Post('rooms/:id/invite')
  async inviteUsers(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: InviteUserDto,
    @Headers('x-invite-usernames') usernamesHeader?: string,
    @Headers('x-invite-names') namesHeader?: string,
  ) {
    let usernames: Record<string, string> = {};
    let names: Record<string, string> = {};
    if (usernamesHeader) {
      try { usernames = JSON.parse(decodeURIComponent(usernamesHeader)); } catch { /* ignore */ }
    }
    if (namesHeader) {
      try { names = JSON.parse(decodeURIComponent(namesHeader)); } catch { /* ignore */ }
    }
    const result = await this.chatService.inviteUsers(roomId, userId, dto, usernames, names);
    return { success: true, data: result };
  }

  /** 채팅방 퇴장
   * Leave a chat room */
  @Post('rooms/:id/leave')
  async leaveRoom(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.chatService.leaveRoom(roomId, userId);
    return { success: true, data: result };
  }

  /** 채팅방에서 사용자 강퇴 (방장만 가능)
   * Kick a user from a chat room (creator only) */
  @Post('rooms/:id/kick')
  async kickUser(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { targetUserId: string },
  ) {
    const result = await this.chatService.kickUser(roomId, body.targetUserId, userId);
    return { success: true, data: result };
  }

  /** 채팅방의 안 읽은 메시지를 읽음 처리
   * Mark unread messages in a room as read */
  @Post('rooms/:id/read')
  async markAsRead(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.chatService.markAsRead(roomId, userId);
    return { success: true, data: result };
  }

  /** 그룹 채팅방 이름 변경
   * Rename a group chat room */
  @Post('rooms/:id/rename')
  async renameRoom(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: RenameRoomDto,
  ) {
    const result = await this.chatService.renameRoom(roomId, userId, body.name);
    return { success: true, data: result };
  }

  /** 채팅방 삭제 (관리자만 가능)
   * Delete a chat room (admin only) */
  @Delete('rooms/:id')
  async deleteRoom(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role?: string,
  ) {
    const result = await this.chatService.deleteRoom(roomId, userId, role);
    return { success: true, data: result };
  }

  /** 메시지 삭제 (본인 또는 관리자)
   * Delete a message (own message or admin) */
  @Delete('rooms/:roomId/messages/:messageId')
  async deleteMessage(
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role?: string,
  ) {
    const result = await this.chatService.deleteMessage(roomId, messageId, userId, role);
    return { success: true, data: result };
  }
}
