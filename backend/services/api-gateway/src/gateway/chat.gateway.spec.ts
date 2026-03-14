import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { Server, Socket } from 'socket.io';

const mockJwtService = {
  verifyAsync: jest.fn(),
};

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);

    // Mock the server
    // G-H-02: server.sockets.sockets Map을 직접 사용하도록 변경 (fetchSockets 제거)
    // G-H-02: Changed to use server.sockets.sockets Map directly (removed fetchSockets)
    gateway.server = {
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      sockets: {
        sockets: new Map(),
      },
    } as unknown as Server;
  });

  describe('notifyUser', () => {
    it('should emit event to all user sockets', async () => {
      // Simulate connection of user with 2 tabs
      const client1 = createMockSocket('socket-1');
      const client2 = createMockSocket('socket-2');
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', username: 'test' });

      await gateway.handleConnection(client1 as unknown as Socket);
      await gateway.handleConnection(client2 as unknown as Socket);

      const toEmit = jest.fn();
      (gateway.server.to as jest.Mock).mockReturnValue({ emit: toEmit });

      gateway.notifyUser('user-1', 'notification:test', { data: 'hello' });

      expect(gateway.server.to).toHaveBeenCalledWith('socket-1');
      expect(gateway.server.to).toHaveBeenCalledWith('socket-2');
      expect(toEmit).toHaveBeenCalledWith('notification:test', { data: 'hello' });
      expect(toEmit).toHaveBeenCalledTimes(2);
    });

    it('should not throw when user has no active sockets', () => {
      expect(() => {
        gateway.notifyUser('offline-user', 'notification:test', {});
      }).not.toThrow();
    });

    it('should support any event name and payload', async () => {
      const client = createMockSocket('socket-x');
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-x', username: 'x' });
      await gateway.handleConnection(client as unknown as Socket);

      const toEmit = jest.fn();
      (gateway.server.to as jest.Mock).mockReturnValue({ emit: toEmit });

      const payload = { type: 'registration-approved', timestamp: '2026-01-01' };
      gateway.notifyUser('user-x', 'notification:registration-approved', payload);

      expect(toEmit).toHaveBeenCalledWith('notification:registration-approved', payload);
    });
  });

  describe('broadcastMessage', () => {
    it('should emit chat:message to room', () => {
      const toEmit = jest.fn();
      (gateway.server.to as jest.Mock).mockReturnValue({ emit: toEmit });

      const message = { id: 'msg-1', content: 'hello', senderId: 'u1' };
      gateway.broadcastMessage('room-1', message);

      expect(gateway.server.to).toHaveBeenCalledWith('room:room-1');
      expect(toEmit).toHaveBeenCalledWith('chat:message', message);
    });
  });

  describe('broadcastReadReceipt', () => {
    it('should emit chat:read to room', () => {
      const toEmit = jest.fn();
      (gateway.server.to as jest.Mock).mockReturnValue({ emit: toEmit });

      gateway.broadcastReadReceipt('room-1', 'user-1');

      expect(gateway.server.to).toHaveBeenCalledWith('room:room-1');
      expect(toEmit).toHaveBeenCalledWith('chat:read', { roomId: 'room-1', userId: 'user-1' });
    });
  });

  describe('handleConnection', () => {
    it('should authenticate and track user socket', async () => {
      const client = createMockSocket('socket-1');
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', username: 'testuser' });

      await gateway.handleConnection(client as unknown as Socket);

      expect(client.data.userId).toBe('user-1');
      expect(client.data.username).toBe('testuser');
      expect(gateway.isUserOnline('user-1')).toBe(true);
    });

    it('should disconnect client with invalid token', async () => {
      const client = createMockSocket('socket-bad');
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(client as unknown as Socket);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client with no token', async () => {
      const client = createMockSocket('socket-notoken', '');

      await gateway.handleConnection(client as unknown as Socket);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should broadcast presence:online on first connection', async () => {
      const client = createMockSocket('socket-1');
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'new-user', username: 'new' });

      await gateway.handleConnection(client as unknown as Socket);

      expect(gateway.server.emit).toHaveBeenCalledWith('presence:online', { userId: 'new-user' });
    });

    it('should not broadcast presence:online on second tab', async () => {
      const client1 = createMockSocket('socket-1');
      const client2 = createMockSocket('socket-2');
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', username: 'test' });

      await gateway.handleConnection(client1 as unknown as Socket);
      (gateway.server.emit as jest.Mock).mockClear();

      await gateway.handleConnection(client2 as unknown as Socket);

      expect(gateway.server.emit).not.toHaveBeenCalledWith('presence:online', expect.anything());
    });
  });

  describe('handleDisconnect', () => {
    it('should broadcast presence:offline when last tab closes', async () => {
      const client = createMockSocket('socket-1');
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', username: 'test' });
      await gateway.handleConnection(client as unknown as Socket);
      (gateway.server.emit as jest.Mock).mockClear();

      gateway.handleDisconnect(client as unknown as Socket);

      expect(gateway.server.emit).toHaveBeenCalledWith('presence:offline', { userId: 'user-1' });
      expect(gateway.isUserOnline('user-1')).toBe(false);
    });

    it('should not broadcast offline when other tabs remain', async () => {
      const client1 = createMockSocket('socket-1');
      const client2 = createMockSocket('socket-2');
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', username: 'test' });
      await gateway.handleConnection(client1 as unknown as Socket);
      await gateway.handleConnection(client2 as unknown as Socket);
      (gateway.server.emit as jest.Mock).mockClear();

      gateway.handleDisconnect(client1 as unknown as Socket);

      expect(gateway.server.emit).not.toHaveBeenCalledWith('presence:offline', expect.anything());
      expect(gateway.isUserOnline('user-1')).toBe(true);
    });
  });

  describe('isUserOnline', () => {
    it('should return false for unknown user', () => {
      expect(gateway.isUserOnline('unknown')).toBe(false);
    });
  });

  describe('getOnlineUserIds', () => {
    it('should return list of connected user IDs', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({ sub: 'u1', username: 'a' });
      mockJwtService.verifyAsync.mockResolvedValueOnce({ sub: 'u2', username: 'b' });

      await gateway.handleConnection(createMockSocket('s1') as unknown as Socket);
      await gateway.handleConnection(createMockSocket('s2') as unknown as Socket);

      const ids = gateway.getOnlineUserIds();
      expect(ids).toContain('u1');
      expect(ids).toContain('u2');
      expect(ids).toHaveLength(2);
    });
  });

  describe('handleJoinRoom', () => {
    it('should join client to room', () => {
      const client = createMockSocket('s1');
      const result = gateway.handleJoinRoom(
        client as unknown as Socket,
        { roomId: 'room-abc' },
      );

      expect(client.join).toHaveBeenCalledWith('room:room-abc');
      expect(result).toEqual({ event: 'chat:joined', data: { roomId: 'room-abc' } });
    });

    it('should not join with empty roomId', () => {
      const client = createMockSocket('s1');
      const result = gateway.handleJoinRoom(
        client as unknown as Socket,
        { roomId: '' },
      );

      expect(client.join).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('handleLeaveRoom', () => {
    it('should leave room', () => {
      const client = createMockSocket('s1');
      gateway.handleLeaveRoom(client as unknown as Socket, { roomId: 'room-abc' });

      expect(client.leave).toHaveBeenCalledWith('room:room-abc');
    });
  });

  describe('handleTyping', () => {
    it('should broadcast typing event to room', async () => {
      const client = createMockSocket('s1');
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'u1', username: 'typer' });
      await gateway.handleConnection(client as unknown as Socket);

      const toEmit = jest.fn();
      client.to = jest.fn().mockReturnValue({ emit: toEmit });

      gateway.handleTyping(client as unknown as Socket, { roomId: 'room-1' });

      expect(client.to).toHaveBeenCalledWith('room:room-1');
      expect(toEmit).toHaveBeenCalledWith('chat:typing', {
        roomId: 'room-1',
        userId: 'u1',
        username: 'typer',
      });
    });
  });
});

// Helper: create mock Socket
function createMockSocket(id: string, token = 'valid-token') {
  return {
    id,
    handshake: {
      auth: { token },
      headers: {},
    },
    data: {} as Record<string, unknown>,
    disconnect: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  };
}
