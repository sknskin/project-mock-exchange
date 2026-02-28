import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TotpService } from './totp.service';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('test-secret-that-is-at-least-32-chars'),
  get: jest.fn(),
};

describe('TotpService', () => {
  let service: TotpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TotpService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TotpService>(TotpService);
    jest.clearAllMocks();
  });

  describe('setup', () => {
    it('should generate TOTP secret and URI', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@test.com',
        totpEnabled: false,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.setup('user-1');

      expect(result.secret).toBeDefined();
      expect(result.secret.length).toBeGreaterThan(10);
      expect(result.uri).toContain('otpauth://totp/');
      expect(result.uri).toContain('VirtuEx');
      expect(result.uri).toContain('test%40test.com');
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.setup('user-x')).rejects.toThrow(BadRequestException);
    });

    it('should throw if TOTP already enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@test.com',
        totpEnabled: true,
      });

      await expect(service.setup('user-1')).rejects.toThrow(BadRequestException);
    });

    it('should store encrypted secret', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@test.com',
        totpEnabled: false,
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.setup('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totpSecret: expect.stringContaining(':'),
            totpEnabled: false,
          }),
        }),
      );
    });
  });

  describe('verify', () => {
    it('should throw if TOTP not configured', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        totpSecret: null,
        totpEnabled: false,
      });

      await expect(service.verify('user-1', '123456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('enable', () => {
    it('should throw on invalid code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        totpSecret: null,
        totpEnabled: false,
      });

      await expect(service.enable('user-1', '000000')).rejects.toThrow(BadRequestException);
    });
  });

  describe('disable', () => {
    it('should throw on invalid code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        totpSecret: null,
        totpEnabled: true,
      });

      await expect(service.disable('user-1', '000000')).rejects.toThrow(BadRequestException);
    });
  });

  describe('isEnabled', () => {
    it('should return true if TOTP is enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: true });

      const result = await service.isEnabled('user-1');

      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.isEnabled('user-x');

      expect(result).toBe(false);
    });
  });
});
