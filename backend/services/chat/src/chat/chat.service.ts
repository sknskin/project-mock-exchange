import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto, RoomTypeDto } from './dto/create-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { InviteUserDto } from './dto/invite-user.dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getRooms(userId: string) {
    const rooms = await this.prisma.room.findMany({
      where: {
        participants: {
          some: { userId, leftAt: null },
        },
      },
      include: {
        participants: {
          where: { leftAt: null },
          select: { id: true, userId: true, username: true, joinedAt: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            senderUsername: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const roomsWithUnread = await Promise.all(
      rooms.map(async (room) => {
        const lastMessage = room.messages[0] || null;

        const totalMessages = await this.prisma.message.count({
          where: { roomId: room.id },
        });
        const readCount = await this.prisma.readReceipt.count({
          where: {
            userId,
            message: { roomId: room.id },
          },
        });
        // Messages I sent are implicitly read
        const mySentCount = await this.prisma.message.count({
          where: { roomId: room.id, senderId: userId },
        });
        const unreadCount = Math.max(0, totalMessages - readCount - mySentCount);

        return {
          id: room.id,
          name: room.name,
          type: room.type,
          participants: room.participants,
          lastMessage,
          unreadCount,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        };
      }),
    );

    return roomsWithUnread;
  }

  async createRoomWithUsernames(
    userId: string,
    username: string,
    dto: CreateRoomDto,
    participantUsernames: Record<string, string>,
  ) {
    if (dto.type === RoomTypeDto.DM) {
      if (dto.participantIds.length !== 1) {
        throw new BadRequestException('DM requires exactly 1 other participant');
      }
      const otherId = dto.participantIds[0];
      if (otherId === userId) {
        throw new BadRequestException('Cannot create DM with yourself');
      }

      const existingRoom = await this.prisma.room.findFirst({
        where: {
          type: 'DM',
          AND: [
            { participants: { some: { userId, leftAt: null } } },
            { participants: { some: { userId: otherId, leftAt: null } } },
          ],
        },
        include: {
          participants: {
            where: { leftAt: null },
            select: { id: true, userId: true, username: true, joinedAt: true },
          },
        },
      });

      if (existingRoom) {
        return {
          ...existingRoom,
          lastMessage: null,
          unreadCount: 0,
        };
      }
    }

    if (dto.type === RoomTypeDto.GROUP) {
      if (!dto.name?.trim()) {
        throw new BadRequestException('Group room requires a name');
      }
    }

    const allParticipantIds = [...new Set([userId, ...dto.participantIds])];

    const room = await this.prisma.room.create({
      data: {
        name: dto.name || null,
        type: dto.type,
        createdBy: userId,
        participants: {
          create: allParticipantIds.map((pid) => ({
            userId: pid,
            username: pid === userId ? username : (participantUsernames[pid] || 'unknown'),
          })),
        },
      },
      include: {
        participants: {
          where: { leftAt: null },
          select: { id: true, userId: true, username: true, joinedAt: true },
        },
      },
    });

    return {
      ...room,
      lastMessage: null,
      unreadCount: 0,
    };
  }

  async getMessages(roomId: string, userId: string, cursor?: string, limit = 30) {
    // Verify user is participant
    await this.verifyParticipant(roomId, userId);

    const messages = await this.prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        roomId: true,
        senderId: true,
        senderUsername: true,
        content: true,
        createdAt: true,
        readReceipts: {
          select: { userId: true },
        },
      },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    // Get active participant count for unread calculation
    const participantCount = await this.prisma.participant.count({
      where: { roomId, leftAt: null },
    });

    const messagesWithUnread = items.map((msg) => {
      // unreadCount = total active participants - sender - those who read
      const readUserIds = new Set(msg.readReceipts.map((r) => r.userId));
      const unreadCount = Math.max(0, participantCount - 1 - readUserIds.size);
      return {
        id: msg.id,
        roomId: msg.roomId,
        senderId: msg.senderId,
        senderUsername: msg.senderUsername,
        content: msg.content,
        createdAt: msg.createdAt,
        unreadCount,
      };
    });

    return {
      items: messagesWithUnread.reverse(),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  async sendMessage(roomId: string, userId: string, username: string, dto: SendMessageDto) {
    await this.verifyParticipant(roomId, userId);

    const message = await this.prisma.message.create({
      data: {
        roomId,
        senderId: userId,
        senderUsername: username,
        content: dto.content,
      },
      select: {
        id: true,
        roomId: true,
        senderId: true,
        senderUsername: true,
        content: true,
        createdAt: true,
      },
    });

    // Update room's updatedAt
    await this.prisma.room.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    // Get participant count for unreadCount
    const participantCount = await this.prisma.participant.count({
      where: { roomId, leftAt: null },
    });

    return {
      ...message,
      unreadCount: participantCount - 1, // everyone except sender hasn't read yet
    };
  }

  async inviteUsers(roomId: string, userId: string, dto: InviteUserDto, usernames: Record<string, string>) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    await this.verifyParticipant(roomId, userId);

    const existingParticipants = await this.prisma.participant.findMany({
      where: { roomId, userId: { in: dto.userIds } },
    });

    const existingUserIds = new Set(existingParticipants.map((p) => p.userId));
    const newUserIds = dto.userIds.filter((id) => !existingUserIds.has(id));

    if (newUserIds.length === 0) {
      return { invited: [] };
    }

    // For users who previously left, reactivate
    const leftParticipants = existingParticipants.filter((p) => p.leftAt !== null);
    for (const p of leftParticipants) {
      await this.prisma.participant.update({
        where: { id: p.id },
        data: { leftAt: null, username: usernames[p.userId] || p.username },
      });
    }

    // Create new participants
    const trulyNew = newUserIds.filter(
      (id) => !leftParticipants.some((p) => p.userId === id),
    );
    if (trulyNew.length > 0) {
      await this.prisma.participant.createMany({
        data: trulyNew.map((uid) => ({
          roomId,
          userId: uid,
          username: usernames[uid] || 'unknown',
        })),
      });
    }

    return {
      invited: [...leftParticipants.map((p) => p.userId), ...trulyNew],
    };
  }

  async leaveRoom(roomId: string, userId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { roomId, userId, leftAt: null },
    });
    if (!participant) {
      throw new NotFoundException('Not a participant of this room');
    }

    await this.prisma.participant.update({
      where: { id: participant.id },
      data: { leftAt: new Date() },
    });

    return { success: true };
  }

  async markAsRead(roomId: string, userId: string) {
    await this.verifyParticipant(roomId, userId);

    // Get all unread messages (not sent by me, not already read)
    const unreadMessages = await this.prisma.message.findMany({
      where: {
        roomId,
        senderId: { not: userId },
        readReceipts: {
          none: { userId },
        },
      },
      select: { id: true },
    });

    if (unreadMessages.length > 0) {
      await this.prisma.readReceipt.createMany({
        data: unreadMessages.map((msg) => ({
          messageId: msg.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    return { read: unreadMessages.length };
  }

  async getRoomParticipants(roomId: string) {
    return this.prisma.participant.findMany({
      where: { roomId, leftAt: null },
      select: { userId: true, username: true },
    });
  }

  private async verifyParticipant(roomId: string, userId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { roomId, userId, leftAt: null },
    });
    if (!participant) {
      throw new ForbiddenException('Not a participant of this room');
    }
    return participant;
  }
}
