import {
  Controller,
  Get,
  Post,
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

@Controller('rooms')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async getRooms(@Headers('x-user-id') userId: string) {
    const rooms = await this.chatService.getRooms(userId);
    return { success: true, data: rooms };
  }

  @Post()
  async createRoom(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-username') username: string,
    @Body() dto: CreateRoomDto,
    @Headers('x-participant-usernames') participantUsernamesHeader?: string,
  ) {
    let participantUsernames: Record<string, string> = {};
    if (participantUsernamesHeader) {
      try {
        participantUsernames = JSON.parse(participantUsernamesHeader);
      } catch {
        // 파싱 오류 무시 (ignore parse errors)
      }
    }
    const room = await this.chatService.createRoomWithUsernames(
      userId,
      username,
      dto,
      participantUsernames,
    );
    return { success: true, data: room };
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
  ) {
    const result = await this.chatService.getMessages(roomId, userId, cursor, limit);
    return { success: true, data: result };
  }

  @Post(':id/messages')
  async sendMessage(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-username') username: string,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.chatService.sendMessage(roomId, userId, username, dto);
    return { success: true, data: message };
  }

  @Post(':id/invite')
  async inviteUsers(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: InviteUserDto,
    @Headers('x-invite-usernames') usernamesHeader?: string,
  ) {
    let usernames: Record<string, string> = {};
    if (usernamesHeader) {
      try {
        usernames = JSON.parse(usernamesHeader);
      } catch {
        // 파싱 오류 무시 (ignore)
      }
    }
    const result = await this.chatService.inviteUsers(roomId, userId, dto, usernames);
    return { success: true, data: result };
  }

  @Post(':id/leave')
  async leaveRoom(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.chatService.leaveRoom(roomId, userId);
    return { success: true, data: result };
  }

  @Post(':id/kick')
  async kickUser(
    @Param('id') roomId: string,
    @Body() body: { targetUserId: string },
  ) {
    const result = await this.chatService.kickUser(roomId, body.targetUserId);
    return { success: true, data: result };
  }

  @Post(':id/read')
  async markAsRead(
    @Param('id') roomId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.chatService.markAsRead(roomId, userId);
    return { success: true, data: result };
  }
}
