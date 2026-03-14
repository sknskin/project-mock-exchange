/**
 * @file 채팅 서비스
 * @description 채팅방 생성/조회, 메시지 CRUD, 참여자 관리, 읽음 확인, 통계 비즈니스 로직.
 *              DM(1:1)과 GROUP(그룹) 채팅을 모두 지원합니다.
 *
 * @file Chat Service
 * @description Business logic for room creation/retrieval, message CRUD, participant
 *              management, read receipts, and statistics. Supports both DM (1:1) and GROUP chat.
 */
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

  /** 사용자가 참여 중인 채팅방 목록을 안읽음 수와 함께 조회합니다
   * Get user's rooms with unread counts */
  async getRooms(userId: string) {
    const rooms = await this.prisma.room.findMany({
      where: {
        participants: {
          some: { userId, leftAt: null },
        },
      },
      include: {
        // 참여자 수 제한 — 대규모 그룹에서 무제한 로딩 방지 (최대 50명)
        // Limit participants — prevent unlimited loading in large groups (max 50)
        participants: {
          where: { leftAt: null },
          take: 50,
          select: { id: true, userId: true, username: true, name: true, joinedAt: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            senderUsername: true,
            senderName: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 단일 raw 쿼리로 방별 안읽음 수를 집계 (N+1 제거)
    // Single raw query to aggregate unread counts per room (eliminates N+1)
    const roomIds = rooms.map((r) => r.id);

    const unreadRows = roomIds.length > 0
      ? await this.prisma.$queryRaw<{ room_id: string; unread: bigint }[]>`
          SELECT m."room_id" AS room_id,
                 COUNT(*) FILTER (
                   WHERE m."sender_id" != ${userId}::uuid
                     AND NOT EXISTS (
                       SELECT 1 FROM "read_receipts" rr
                       WHERE rr."message_id" = m.id AND rr."user_id" = ${userId}::uuid
                     )
                 )::bigint AS unread
          FROM "messages" m
          WHERE m."room_id" = ANY(${roomIds}::uuid[])
          GROUP BY m."room_id"
        `
      : [];

    const unreadMap = new Map(unreadRows.map((r) => [r.room_id, Number(r.unread)]));

    const roomsWithUnread = rooms.map((room) => {
      const lastMessage = room.messages[0] || null;
      const unreadCount = unreadMap.get(room.id) || 0;

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
    });

    return roomsWithUnread;
  }

  /**
   * 채팅방을 생성합니다. DM은 기존 방이 있으면 재사용하고, 없으면 새로 생성합니다.
   * Creates a chat room. For DM, reuses existing room if found, otherwise creates new.
   */
  async createRoomWithUsernames(
    userId: string,
    username: string,
    dto: CreateRoomDto,
    participantUsernames: Record<string, string>,
    creatorName?: string,
    participantNames?: Record<string, string>,
  ) {
    // DM: 동일 두 사용자 간 기존 방 재사용 (중복 DM 방지) / DM: reuse existing room between same two users (prevents duplicate DMs)
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
            select: { id: true, userId: true, username: true, name: true, joinedAt: true },
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
      if (dto.participantIds.length < 1) {
        throw new BadRequestException('Group room requires at least 1 other participant');
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
            name: pid === userId ? (creatorName || '') : (participantNames?.[pid] || ''),
          })),
        },
      },
      include: {
        participants: {
          where: { leftAt: null },
          select: { id: true, userId: true, username: true, name: true, joinedAt: true },
        },
      },
    });

    return {
      ...room,
      lastMessage: null,
      unreadCount: 0,
    };
  }

  /** 채팅방의 메시지를 커서 기반 페이징으로 조회합니다
   * Get room messages with cursor-based pagination */
  async getMessages(roomId: string, userId: string, cursor?: string, limit = 30) {
    // 사용자가 참여자인지 확인 (Verify user is participant)
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
        senderName: true,
        senderRole: true,
        content: true,
        createdAt: true,
        readReceipts: {
          select: { userId: true },
        },
      },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    // 안 읽은 메시지 수 계산을 위한 활성 참여자 수 조회 (Get active participant count for unread calculation)
    const participantCount = await this.prisma.participant.count({
      where: { roomId, leftAt: null },
    });

    const messagesWithUnread = items.map((msg) => {
      // 안읽음 수 = 전체 활성 참여자 - 발신자 - 읽은 사람 (unreadCount = total active participants - sender - those who read)
      const readUserIds = new Set(msg.readReceipts.map((r) => r.userId));
      const unreadCount = Math.max(0, participantCount - 1 - readUserIds.size);
      return {
        id: msg.id,
        roomId: msg.roomId,
        senderId: msg.senderId,
        senderUsername: msg.senderUsername,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
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

  /** 채팅방에 메시지를 전송하고 방의 updatedAt을 갱신합니다
   * Send a message to a room and update room's updatedAt */
  async sendMessage(roomId: string, userId: string, username: string, dto: SendMessageDto, name?: string, role?: string) {
    // 참여자 검증 + 메시지 생성 + 방 업데이트를 트랜잭션으로 원자적 처리
    // Wrap participant verification + message creation + room update in a transaction for atomicity
    const { message, participantCount } = await this.prisma.$transaction(async (tx) => {
      // 트랜잭션 내에서 참여자 검증 (Verify participant within transaction)
      const participant = await tx.participant.findFirst({
        where: { roomId, userId, leftAt: null },
      });
      if (!participant) {
        throw new ForbiddenException('Not a participant of this room');
      }

      const msg = await tx.message.create({
        data: {
          roomId,
          senderId: userId,
          senderUsername: username,
          senderName: name || '',
          senderRole: role || 'USER',
          content: dto.content,
        },
        select: {
          id: true,
          roomId: true,
          senderId: true,
          senderUsername: true,
          senderName: true,
          senderRole: true,
          content: true,
          createdAt: true,
        },
      });

      // 채팅방의 최근 업데이트 시간 갱신 (Update room's updatedAt)
      await tx.room.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });

      // 안읽음 수 계산을 위한 참여자 수 조회 (Get participant count for unreadCount)
      const pCount = await tx.participant.count({
        where: { roomId, leftAt: null },
      });

      return { message: msg, participantCount: pCount };
    });

    return {
      ...message,
      unreadCount: participantCount - 1, // 발신자를 제외한 모든 참여자가 아직 읽지 않음 (everyone except sender hasn't read yet)
    };
  }

  /** 채팅방에 사용자를 초대합니다 (퇴장한 사용자는 재활성화)
   * Invite users to a room (reactivate if previously left) */
  async inviteUsers(roomId: string, userId: string, dto: InviteUserDto, usernames: Record<string, string>, names?: Record<string, string>) {
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

    // 이전에 퇴장한 사용자는 재활성화 (For users who previously left, reactivate)
    const leftParticipants = existingParticipants.filter((p) => p.leftAt !== null);
    for (const p of leftParticipants) {
      await this.prisma.participant.update({
        where: { id: p.id },
        data: { leftAt: null, username: usernames[p.userId] || p.username, name: names?.[p.userId] || '' },
      });
    }

    // 새 참여자 생성 (Create new participants)
    const trulyNew = newUserIds.filter(
      (id) => !leftParticipants.some((p) => p.userId === id),
    );
    if (trulyNew.length > 0) {
      await this.prisma.participant.createMany({
        data: trulyNew.map((uid) => ({
          roomId,
          userId: uid,
          username: usernames[uid] || 'unknown',
          name: names?.[uid] || '',
        })),
      });
    }

    const invitedAll = [...leftParticipants.map((p) => p.userId), ...trulyNew];
    const invitedNames = invitedAll.map((uid) => names?.[uid] || usernames[uid] || 'unknown');

    let systemMessage = null;
    if (invitedNames.length > 0) {
      systemMessage = await this.createSystemMessage(roomId, JSON.stringify({
        action: 'invite',
        names: invitedNames,
      }));
    }

    return { invited: invitedAll, systemMessage };
  }

  /** 채팅방에서 퇴장하고 시스템 메시지를 남깁니다
   * Leave a room and post a system message */
  async leaveRoom(roomId: string, userId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { roomId, userId, leftAt: null },
    });
    if (!participant) {
      throw new NotFoundException('Not a participant of this room');
    }

    const displayName = participant.name || participant.username;

    await this.prisma.participant.update({
      where: { id: participant.id },
      data: { leftAt: new Date() },
    });

    const systemMessage = await this.createSystemMessage(roomId, JSON.stringify({
      action: 'leave',
      name: displayName,
    }));

    return { success: true, systemMessage };
  }

  /** 채팅방에서 사용자를 강퇴합니다 (방장만 가능)
   * Kick a user from a room (creator only) */
  async kickUser(roomId: string, targetUserId: string, requesterId?: string) {
    // 방 생성자만 강퇴 가능 (Only room creator can kick users)
    if (requesterId) {
      const room = await this.prisma.room.findUnique({ where: { id: roomId } });
      if (!room) throw new NotFoundException('Room not found');
      if (room.createdBy !== requesterId) {
        throw new ForbiddenException('Only the room creator can kick users');
      }
    }

    const participant = await this.prisma.participant.findFirst({
      where: { roomId, userId: targetUserId, leftAt: null },
    });
    if (!participant) {
      throw new NotFoundException('User is not a participant of this room');
    }

    const displayName = participant.name || participant.username;

    await this.prisma.participant.update({
      where: { id: participant.id },
      data: { leftAt: new Date() },
    });

    const systemMessage = await this.createSystemMessage(roomId, JSON.stringify({
      action: 'kick',
      name: displayName,
    }));

    return { success: true, kickedUserId: targetUserId, systemMessage };
  }

  /** 채팅방의 안 읽은 메시지를 읽음 처리합니다 (최대 500건)
   * Mark unread messages as read (max 500) */
  async markAsRead(roomId: string, userId: string) {
    await this.verifyParticipant(roomId, userId);

    // 최근 안 읽은 메시지 조회 (최대 500건) / Get recent unread messages (max 500)
    const unreadMessages = await this.prisma.message.findMany({
      where: {
        roomId,
        senderId: { not: userId },
        readReceipts: {
          none: { userId },
        },
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
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

  /** 그룹 채팅방의 이름을 변경합니다
   * Rename a group chat room */
  async renameRoom(roomId: string, userId: string, name: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.type !== 'GROUP') {
      throw new BadRequestException('Only GROUP rooms can be renamed');
    }
    await this.verifyParticipant(roomId, userId);

    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: { name },
    });
    return { id: updated.id, name: updated.name };
  }

  /** 메시지를 삭제합니다 (본인, ADMIN, SYSTEM만 가능)
   * Delete a message (owner, ADMIN, or SYSTEM only) */
  async deleteMessage(roomId: string, messageId: string, userId: string, role?: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.roomId !== roomId) {
      throw new BadRequestException('Message does not belong to this room');
    }

    const isSystem = role === 'SYSTEM';
    const isAdmin = role === 'ADMIN';
    const isMine = message.senderId === userId;

    if (!isMine && !isSystem && !isAdmin) {
      throw new ForbiddenException('You can only delete your own messages');
    }
    // ADMIN은 SYSTEM이 남긴 메시지를 삭제할 수 없음
    if (isAdmin && message.senderRole === 'SYSTEM') {
      throw new ForbiddenException('Admins cannot delete SYSTEM messages');
    }

    // 연결된 읽음 확인 삭제 후 메시지 삭제 (Delete read receipts then delete message)
    await this.prisma.readReceipt.deleteMany({
      where: { messageId },
    });
    await this.prisma.message.delete({
      where: { id: messageId },
    });

    return { success: true, deletedMessageId: messageId };
  }

  /** 채팅방과 관련 데이터를 모두 삭제합니다 (관리자만 가능)
   * Delete a room and all related data (admin only) */
  async deleteRoom(roomId: string, _userId: string, role?: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const isSystem = role === 'SYSTEM';
    const isAdmin = role === 'ADMIN';
    if (!isSystem && !isAdmin) {
      throw new ForbiddenException('Only admins can delete rooms');
    }

    // 관련 데이터 삭제 순서: ReadReceipt → Message → Participant → Room (atomic transaction)
    await this.prisma.$transaction([
      this.prisma.readReceipt.deleteMany({ where: { message: { roomId } } }),
      this.prisma.message.deleteMany({ where: { roomId } }),
      this.prisma.participant.deleteMany({ where: { roomId } }),
      this.prisma.room.delete({ where: { id: roomId } }),
    ]);

    return { success: true, deletedRoomId: roomId };
  }

  /** 채팅방의 활성 참여자 목록을 조회합니다
   * Get active participants in a room */
  async getRoomParticipants(roomId: string) {
    return this.prisma.participant.findMany({
      where: { roomId, leftAt: null },
      select: { userId: true, username: true, name: true },
    });
  }

  /** 채팅 통계를 조회합니다 (방 수, 메시지 수, 일별 추이 등)
   * Get chat statistics (room count, message count, daily trends, etc.) */
  async getStatistics(days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [
      totalRooms,
      dmCount,
      groupCount,
      totalMessages,
      todayMessages,
      yesterdayMessages,
      activeParticipants,
      dailyMessages,
      topRooms,
    ] = await Promise.all([
      this.prisma.room.count(),
      this.prisma.room.count({ where: { type: 'DM' } }),
      this.prisma.room.count({ where: { type: 'GROUP' } }),
      this.prisma.message.count(),
      this.prisma.message.count({ where: { createdAt: { gte: today } } }),
      this.prisma.message.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      this.prisma.participant.groupBy({
        by: ['userId'],
        where: { leftAt: null },
      }).then((r) => r.length),
      this.prisma.$queryRaw<{ label: string; count: bigint }[]>`
        SELECT TO_CHAR("created_at", 'YYYY-MM-DD') AS label, COUNT(*)::bigint AS count
        FROM "messages"
        WHERE "created_at" >= ${since}
        GROUP BY label ORDER BY label
      `,
      this.prisma.$queryRaw<{ room_id: string; name: string | null; type: string; count: bigint }[]>`
        SELECT r.id AS room_id, r.name, r.type, COUNT(m.id)::bigint AS count
        FROM "rooms" r JOIN "messages" m ON m."room_id" = r.id
        WHERE m."created_at" >= ${since}
        GROUP BY r.id ORDER BY count DESC LIMIT 10
      `,
    ]);

    return {
      totalRooms,
      dmCount,
      groupCount,
      totalMessages,
      todayMessages,
      yesterdayMessages,
      activeParticipants,
      dailyMessages: dailyMessages.map((d) => ({ label: d.label, count: Number(d.count) })),
      topRooms: topRooms.map((r) => ({
        roomId: r.room_id,
        name: r.name || (r.type === 'DM' ? 'DM' : 'Group'),
        type: r.type,
        messageCount: Number(r.count),
      })),
    };
  }

  /**
   * 시스템 메시지를 생성합니다 (초대, 퇴장, 강퇴 등의 알림).
   * senderId로 UUID 0을 사용하여 일반 사용자 메시지와 구분합니다.
   *
   * Creates a system message (for invite, leave, kick notifications).
   * Uses UUID 0 as senderId to distinguish from regular user messages.
   */
  private async createSystemMessage(roomId: string, content: string) {
    const message = await this.prisma.message.create({
      data: {
        roomId,
        senderId: '00000000-0000-0000-0000-000000000000',
        senderUsername: 'system',
        senderName: '',
        senderRole: 'SYSTEM',
        content,
      },
      select: {
        id: true,
        roomId: true,
        senderId: true,
        senderUsername: true,
        senderName: true,
        senderRole: true,
        content: true,
        createdAt: true,
      },
    });

    await this.prisma.room.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    return { ...message, unreadCount: 0 };
  }

  // 사용자가 채팅방의 활성 참여자인지 검증 — 모든 메시지 및 방 조작 API에서 호출
  // Verifies user is an active participant — called by all message and room manipulation APIs
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
