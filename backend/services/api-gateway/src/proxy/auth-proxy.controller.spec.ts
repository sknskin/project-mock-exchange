import { Test, TestingModule } from '@nestjs/testing';
import { AuthProxyController } from './auth-proxy.controller';
import { ProxyService } from './proxy.service';
import { ChatGateway } from '../gateway/chat.gateway';
import { Response } from 'express';

const mockProxyService = {
  forward: jest.fn(),
};

const mockServer = { emit: jest.fn() };
const mockChatGateway = { server: mockServer, notifyUser: jest.fn() };

function mockRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
}

describe('AuthProxyController', () => {
  let controller: AuthProxyController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthProxyController],
      providers: [
        { provide: ProxyService, useValue: mockProxyService },
        { provide: ChatGateway, useValue: mockChatGateway },
      ],
    }).compile();

    controller = module.get<AuthProxyController>(AuthProxyController);
  });

  describe('register', () => {
    it('should broadcast registration-request on success', async () => {
      const body = {
        email: 'new@test.com',
        username: 'newuser',
        password: 'Pass1234',
        name: '신규회원',
      };
      mockProxyService.forward.mockResolvedValue({
        status: 201,
        data: { username: 'newuser', name: '신규회원' },
      });

      const res = mockRes();
      await controller.register(body as any, res as Response);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification:registration-request',
        expect.objectContaining({
          type: 'registration-request',
          username: 'newuser',
          name: '신규회원',
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should use body username if response lacks it', async () => {
      const body = { username: 'fromBody', name: 'From Body' };
      mockProxyService.forward.mockResolvedValue({
        status: 201,
        data: {},
      });

      const res = mockRes();
      await controller.register(body as any, res as Response);

      const payload = mockServer.emit.mock.calls[0][1];
      expect(payload.username).toBe('fromBody');
      expect(payload.name).toBe('From Body');
    });

    it('should include timestamp in registration notification', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 201,
        data: { username: 'test' },
      });

      const res = mockRes();
      await controller.register({ username: 'test' } as any, res as Response);

      const payload = mockServer.emit.mock.calls[0][1];
      expect(payload.timestamp).toBeDefined();
      expect(new Date(payload.timestamp).getTime()).not.toBeNaN();
    });

    it('should not broadcast on registration failure (400)', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 400,
        data: { message: 'Validation error' },
      });

      const res = mockRes();
      await controller.register({ username: 'bad' } as any, res as Response);

      expect(mockServer.emit).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should not broadcast on duplicate conflict (409)', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 409,
        data: { message: 'Duplicate email' },
      });

      const res = mockRes();
      await controller.register({ username: 'dup' } as any, res as Response);

      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });
});
