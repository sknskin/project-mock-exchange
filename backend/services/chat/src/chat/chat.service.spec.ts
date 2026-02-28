import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  room: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  message: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  participant: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  readReceipt: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    groupBy: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  describe('createRoomWithUsernames', () => {
    it('should throw if DM has more than 1 participant', async () => {
      await expect(
        service.createRoomWithUsernames('user1', 'user1name', {
          type: 'DM' as any,
          participantIds: ['user2', 'user3'],
        }, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if DM with yourself', async () => {
      await expect(
        service.createRoomWithUsernames('user1', 'user1name', {
          type: 'DM' as any,
          participantIds: ['user1'],
        }, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing DM room if already exists', async () => {
      const existingRoom = {
        id: 'room-1',
        type: 'DM',
        name: null,
        participants: [
          { id: 'p1', userId: 'user1', username: 'u1', name: 'User 1', joinedAt: new Date() },
          { id: 'p2', userId: 'user2', username: 'u2', name: 'User 2', joinedAt: new Date() },
        ],
      };
      mockPrisma.room.findFirst.mockResolvedValue(existingRoom);

      const result = await service.createRoomWithUsernames(
        'user1', 'u1',
        { type: 'DM' as any, participantIds: ['user2'] },
        { user2: 'u2' },
      );

      expect(result.id).toBe('room-1');
      expect(result.lastMessage).toBeNull();
      expect(mockPrisma.room.create).not.toHaveBeenCalled();
    });

    it('should create new GROUP room', async () => {
      mockPrisma.room.findFirst.mockResolvedValue(null);
      mockPrisma.room.create.mockResolvedValue({
        id: 'room-new',
        name: 'My Group',
        type: 'GROUP',
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createRoomWithUsernames(
        'user1', 'u1',
        { type: 'GROUP' as any, participantIds: ['user2'], name: 'My Group' },
        { user2: 'u2' },
      );

      expect(result.id).toBe('room-new');
      expect(mockPrisma.room.create).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should create message and update room', async () => {
      mockPrisma.participant.findFirst.mockResolvedValue({ id: 'p1', userId: 'user1' });
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-1',
        roomId: 'room-1',
        senderId: 'user1',
        senderUsername: 'u1',
        senderName: 'User 1',
        senderRole: 'USER',
        content: 'Hello',
        createdAt: new Date(),
      });
      mockPrisma.room.update.mockResolvedValue({});
      mockPrisma.participant.count.mockResolvedValue(3);

      const result = await service.sendMessage(
        'room-1', 'user1', 'u1',
        { content: 'Hello' },
        'User 1', 'USER',
      );

      expect(result.content).toBe('Hello');
      expect(result.unreadCount).toBe(2);
      expect(mockPrisma.room.update).toHaveBeenCalled();
    });

    it('should throw if user is not participant', async () => {
      mockPrisma.participant.findFirst.mockResolvedValue(null);

      await expect(
        service.sendMessage('room-1', 'user1', 'u1', { content: 'Hello' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteMessage', () => {
    it('should allow sender to delete own message', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg-1',
        roomId: 'room-1',
        senderId: 'user1',
        senderRole: 'USER',
      });
      mockPrisma.readReceipt.deleteMany.mockResolvedValue({});
      mockPrisma.message.delete.mockResolvedValue({});

      const result = await service.deleteMessage('room-1', 'msg-1', 'user1');

      expect(result.success).toBe(true);
    });

    it('should throw if non-owner tries to delete', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg-1',
        roomId: 'room-1',
        senderId: 'user1',
        senderRole: 'USER',
      });

      await expect(
        service.deleteMessage('room-1', 'msg-1', 'user2', 'USER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow SYSTEM to delete any message', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg-1',
        roomId: 'room-1',
        senderId: 'user1',
        senderRole: 'USER',
      });
      mockPrisma.readReceipt.deleteMany.mockResolvedValue({});
      mockPrisma.message.delete.mockResolvedValue({});

      const result = await service.deleteMessage('room-1', 'msg-1', 'admin1', 'SYSTEM');

      expect(result.success).toBe(true);
    });

    it('should prevent ADMIN from deleting SYSTEM messages', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg-1',
        roomId: 'room-1',
        senderId: 'system-id',
        senderRole: 'SYSTEM',
      });

      await expect(
        service.deleteMessage('room-1', 'msg-1', 'admin1', 'ADMIN'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteMessage('room-1', 'msg-x', 'user1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('leaveRoom', () => {
    it('should mark participant as left', async () => {
      mockPrisma.participant.findFirst.mockResolvedValue({
        id: 'p1',
        userId: 'user1',
        username: 'u1',
        name: 'User 1',
      });
      mockPrisma.participant.update.mockResolvedValue({});
      mockPrisma.message.create.mockResolvedValue({
        id: 'sys-msg',
        roomId: 'room-1',
        senderId: '00000000-0000-0000-0000-000000000000',
        senderUsername: 'system',
        senderName: '',
        senderRole: 'SYSTEM',
        content: '{}',
        createdAt: new Date(),
      });
      mockPrisma.room.update.mockResolvedValue({});

      const result = await service.leaveRoom('room-1', 'user1');

      expect(result.success).toBe(true);
      expect(mockPrisma.participant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ leftAt: expect.any(Date) }),
        }),
      );
    });

    it('should throw if not a participant', async () => {
      mockPrisma.participant.findFirst.mockResolvedValue(null);

      await expect(
        service.leaveRoom('room-1', 'user-x'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('renameRoom', () => {
    it('should rename GROUP room', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({ id: 'room-1', type: 'GROUP' });
      mockPrisma.participant.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.room.update.mockResolvedValue({ id: 'room-1', name: 'New Name' });

      const result = await service.renameRoom('room-1', 'user1', 'New Name');

      expect(result.name).toBe('New Name');
    });

    it('should throw if DM room', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({ id: 'room-1', type: 'DM' });

      await expect(
        service.renameRoom('room-1', 'user1', 'Some Name'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markAsRead', () => {
    it('should create read receipts for unread messages', async () => {
      mockPrisma.participant.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-1' },
        { id: 'msg-2' },
      ]);
      mockPrisma.readReceipt.createMany.mockResolvedValue({ count: 2 });

      const result = await service.markAsRead('room-1', 'user1');

      expect(result.read).toBe(2);
    });

    it('should return 0 if no unread messages', async () => {
      mockPrisma.participant.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await service.markAsRead('room-1', 'user1');

      expect(result.read).toBe(0);
    });
  });
});
