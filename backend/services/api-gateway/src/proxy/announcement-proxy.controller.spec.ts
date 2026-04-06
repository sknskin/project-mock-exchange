import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementProxyController } from './announcement-proxy.controller';
import { ProxyService } from './proxy.service';
import { ChatGateway } from '../gateway/chat.gateway';
import { Request, Response } from 'express';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';

const mockProxyService = {
  forward: jest.fn(),
};

const mockServer = { emit: jest.fn() };
const mockChatGateway = { server: mockServer, notifyUser: jest.fn() };

function mockRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

function mockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    headers: { authorization: 'Bearer test-token' },
    query: {},
    user: { id: 'admin-1', username: 'admin1' },
    ...overrides,
  };
}

describe('AnnouncementProxyController', () => {
  let controller: AnnouncementProxyController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnnouncementProxyController],
      providers: [
        { provide: ProxyService, useValue: mockProxyService },
        { provide: ChatGateway, useValue: mockChatGateway },
      ],
    }).compile();

    controller = module.get<AnnouncementProxyController>(AnnouncementProxyController);
  });

  describe('create', () => {
    it('should emit notification:announcement-new on success', async () => {
      const body = { title: '새 공지', content: '내용', category: 'GENERAL' };
      mockProxyService.forward.mockResolvedValue({
        status: 201,
        data: { id: 'ann-1', title: '새 공지' },
      });

      const res = mockRes();
      await controller.create(body, mockReq() as Request, res as Response);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification:announcement-new',
        expect.objectContaining({
          type: 'announcement-new',
          title: '새 공지',
          announcementId: 'ann-1',
          authorId: 'admin-1',
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should not emit notification on failure (4xx)', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 400,
        data: { message: 'Validation failed' },
      });

      const res = mockRes();
      await controller.create({} as CreateAnnouncementDto, mockReq() as Request, res as Response);

      expect(mockServer.emit).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should include timestamp in notification payload', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 201,
        data: { id: 'ann-2' },
      });

      const res = mockRes();
      await controller.create({ title: 'Test' } as CreateAnnouncementDto, mockReq() as Request, res as Response);

      const payload = mockServer.emit.mock.calls[0][1];
      expect(payload.timestamp).toBeDefined();
      expect(new Date(payload.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('update', () => {
    it('should emit notification:announcement-updated on success', async () => {
      const body = { title: '수정된 공지', content: '수정 내용' };
      mockProxyService.forward.mockResolvedValue({
        status: 200,
        data: { id: 'ann-1' },
      });

      const res = mockRes();
      await controller.update('ann-1', body, mockReq() as Request, res as Response);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification:announcement-updated',
        expect.objectContaining({
          type: 'announcement-updated',
          title: '수정된 공지',
          announcementId: 'ann-1',
          authorId: 'admin-1',
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should not emit notification on 404', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 404,
        data: { message: 'Not found' },
      });

      const res = mockRes();
      await controller.update('non-existent', {} as UpdateAnnouncementDto, mockReq() as Request, res as Response);

      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should proxy GET request without emitting events', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 200,
        data: { items: [], total: 0 },
      });

      const res = mockRes();
      await controller.list(mockReq() as Request, res as Response);

      expect(mockServer.emit).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('delete', () => {
    it('should proxy DELETE without emitting live toast events', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      const res = mockRes();
      await controller.delete('ann-1', mockReq() as Request, res as Response);

      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });
});
