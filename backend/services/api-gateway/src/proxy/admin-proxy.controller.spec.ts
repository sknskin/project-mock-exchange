import { Test, TestingModule } from '@nestjs/testing';
import { AdminProxyController } from './admin-proxy.controller';
import { ProxyService } from './proxy.service';
import { ChatGateway } from '../gateway/chat.gateway';
import { Request, Response } from 'express';

const mockProxyService = {
  forward: jest.fn(),
};

const mockServer = { emit: jest.fn() };
const mockChatGateway = { server: mockServer, notifyUser: jest.fn() };

function mockRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    headers: { authorization: 'Bearer admin-token' },
    query: {},
    ...overrides,
  };
}

describe('AdminProxyController', () => {
  let controller: AdminProxyController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminProxyController],
      providers: [
        { provide: ProxyService, useValue: mockProxyService },
        { provide: ChatGateway, useValue: mockChatGateway },
      ],
    }).compile();

    controller = module.get<AdminProxyController>(AdminProxyController);
  });

  describe('approveUser', () => {
    it('should notify target user on successful approval', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      const res = mockRes();
      await controller.approveUser('user-123', {}, mockReq() as Request, res as Response);

      expect(mockChatGateway.notifyUser).toHaveBeenCalledWith(
        'user-123',
        'notification:registration-approved',
        expect.objectContaining({
          type: 'registration-approved',
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should include timestamp in approval notification', async () => {
      mockProxyService.forward.mockResolvedValue({ status: 200, data: {} });

      const res = mockRes();
      await controller.approveUser('user-1', {}, mockReq() as Request, res as Response);

      const payload = mockChatGateway.notifyUser.mock.calls[0][2];
      expect(payload.timestamp).toBeDefined();
      expect(new Date(payload.timestamp).getTime()).not.toBeNaN();
    });

    it('should not notify on approval failure', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 404,
        data: { message: 'User not found' },
      });

      const res = mockRes();
      await controller.approveUser('non-existent', {}, mockReq() as Request, res as Response);

      expect(mockChatGateway.notifyUser).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should not notify on 400 error (already approved)', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 400,
        data: { message: 'Already approved' },
      });

      const res = mockRes();
      await controller.approveUser('user-1', {}, mockReq() as Request, res as Response);

      expect(mockChatGateway.notifyUser).not.toHaveBeenCalled();
    });
  });

  describe('rejectUser', () => {
    it('should notify target user on successful rejection', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      const body = { reason: '서류 미비' };
      const res = mockRes();
      await controller.rejectUser('user-456', body, mockReq() as Request, res as Response);

      expect(mockChatGateway.notifyUser).toHaveBeenCalledWith(
        'user-456',
        'notification:registration-rejected',
        expect.objectContaining({
          type: 'registration-rejected',
          reason: '서류 미비',
        }),
      );
    });

    it('should send empty reason if not provided', async () => {
      mockProxyService.forward.mockResolvedValue({ status: 200, data: {} });

      const res = mockRes();
      await controller.rejectUser('user-1', {}, mockReq() as Request, res as Response);

      const payload = mockChatGateway.notifyUser.mock.calls[0][2];
      expect(payload.reason).toBe('');
    });

    it('should not notify on rejection failure', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 500,
        data: { message: 'Internal error' },
      });

      const res = mockRes();
      await controller.rejectUser('user-1', {}, mockReq() as Request, res as Response);

      expect(mockChatGateway.notifyUser).not.toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('should proxy without emitting notifications', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 200,
        data: { users: [], total: 0 },
      });

      const res = mockRes();
      await controller.listUsers(mockReq() as Request, res as Response);

      expect(mockChatGateway.notifyUser).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });
});
