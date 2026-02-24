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
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { InviteUserDto } from './dto/invite-user.dto';

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
    let participantUsernames: Record<string, string> = {};
    let participantNames: Record<string, string> = {};
    if (participantUsernamesHeader) {
      try { participantUsernames = JSON.parse(participantUsernamesHeader); } catch { /* ignore */ }
    }
    if (participantNamesHeader) {
      try { participantNames = JSON.parse(participantNamesHeader); } catch { /* ignore */ }
    }
    const room = await this.chatService.createRoomWithUsernames(
      userId,
      username,
      dto,
      participantUsernames,
      name || '',
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
    const result = await this.chatService.getMessages(roomId, userId, cursor, limit);
    return { success: true, data: result };
  }

  @Post('rooms/:id/messages')
  async sendMessage(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-username') username: string,
    @Headers('x-user-name') name: string,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.chatService.sendMessage(roomId, userId, username, dto, name || '');
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
      try { usernames = JSON.parse(usernamesHeader); } catch { /* ignore */ }
    }
    if (namesHeader) {
      try { names = JSON.parse(namesHeader); } catch { /* ignore */ }
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
    @Body() body: { targetUserId: string },
  ) {
    const result = await this.chatService.kickUser(roomId, body.targetUserId);
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
    @Body() body: { name: string },
  ) {
    const result = await this.chatService.renameRoom(roomId, userId, body.name);
    return { success: true, data: result };
  }

  @Delete('rooms/:roomId/messages/:messageId')
  async deleteMessage(
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role?: string,
  ) {
    const isAdmin = role === 'ADMIN' || role === 'SYSTEM';
    const result = await this.chatService.deleteMessage(roomId, messageId, userId, isAdmin);
    return { success: true, data: result };
  }
}
