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

@UseGuards(InternalAuthGuard)
@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // 채팅 통계 (Chat Statistics)
  @Get('statistics')
  async statistics(@Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number) {
    const data = await this.chatService.getStatistics(days);
    return { success: true, data };
  }

  @Get('rooms')
  async getRooms(@Headers('x-user-id') userId: string) {
    const rooms = await this.chatService.getRooms(userId);
    return { success: true, data: rooms };
  }

  @Post('rooms')
  async createRoom(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-username') username: string,
    @Headers('x-user-name') name: string,
    @Body() dto: CreateRoomDto,
    @Headers('x-participant-usernames') participantUsernamesHeader?: string,
    @Headers('x-participant-names') participantNamesHeader?: string,
  ) {
    let decodedName = '';
    try { decodedName = name ? decodeURIComponent(name).slice(0, 100) : ''; } catch { decodedName = ''; }
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

  @Post('rooms/:id/leave')
  async leaveRoom(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.chatService.leaveRoom(roomId, userId);
    return { success: true, data: result };
  }

  @Post('rooms/:id/kick')
  async kickUser(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { targetUserId: string },
  ) {
    const result = await this.chatService.kickUser(roomId, body.targetUserId, userId);
    return { success: true, data: result };
  }

  @Post('rooms/:id/read')
  async markAsRead(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.chatService.markAsRead(roomId, userId);
    return { success: true, data: result };
  }

  @Post('rooms/:id/rename')
  async renameRoom(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: RenameRoomDto,
  ) {
    const result = await this.chatService.renameRoom(roomId, userId, body.name);
    return { success: true, data: result };
  }

  @Delete('rooms/:id')
  async deleteRoom(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role?: string,
  ) {
    const result = await this.chatService.deleteRoom(roomId, userId, role);
    return { success: true, data: result };
  }

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
