import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
import { SmsVerificationService } from './sms-verification.service';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.module';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

import * as bcrypt from 'bcrypt';

const mockUser = new UserEntity(
  'user-1',
  'test@test.com',
  'testuser',
  '$2b$12$hashedpassword',
  'Test User',
  'USER',
  true,
  'APPROVED',
  new Date(),
  null,
  null,
  null,
  null,
  null,
  new Date(),
  new Date(),
  '01012345678',
  'encrypted-rrn',
  '서울시 강남구',
  '101호',
  '06241',
);

const mockUserRepository = {
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  findByPhone: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultVal?: string) => {
    const map: Record<string, string> = {
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
    };
    return map[key] || defaultVal;
  }),
  getOrThrow: jest.fn((key: string) => {
    if (key === 'JWT_SECRET') return 'test-secret-key-for-testing-only';
    throw new Error(`Missing env: ${key}`);
  }),
};

const mockPrisma = {
  user: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ lockedAt: null }),
    update: jest.fn().mockResolvedValue({}),
  },
  notification: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
  refreshToken: {
    create: jest.fn().mockResolvedValue({}),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  loginLog: { create: jest.fn().mockResolvedValue({}) },
};

const mockSmsVerification = {
  isPhoneVerified: jest.fn(),
  sendVerificationCode: jest.fn(),
  verifyCode: jest.fn(),
};

const mockRedis = {
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(180),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ lockedAt: null });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SmsVerificationService, useValue: mockSmsVerification },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return SMS verification requirement on valid credentials', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('test@test.com', 'password123');

      expect(result.requireSmsVerification).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(result.maskedPhone).toBe('010****5678');
      expect(mockSmsVerification.sendVerificationCode).toHaveBeenCalledWith('01012345678');
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should login with valid username', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('testuser', 'password123');

      expect(result.requireSmsVerification).toBe(true);
      expect(result.sessionId).toBeDefined();
    });

    it('should throw on invalid credentials (user not found)', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);

      await expect(service.login('nonexistent@test.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw on invalid password', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('test@test.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject locked account', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPrisma.user.findUnique.mockResolvedValue({ lockedAt: new Date() });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login('test@test.com', 'password')).rejects.toThrow(
        'Account is locked',
      );
    });

    it('should reject deactivated user', async () => {
      const deactivatedUser = new UserEntity(
        'user-2', 'deactive@test.com', 'deactive', 'hash', 'Deactivated',
        'USER', false, 'APPROVED', null, null, null, null, null, null,
        new Date(), new Date(), '010-0000-0000', 'enc', 'addr', null, '00000',
      );
      mockUserRepository.findByEmail.mockResolvedValue(deactivatedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login('deactive@test.com', 'password')).rejects.toThrow(
        'Account is deactivated',
      );
    });

    it('should reject unapproved user', async () => {
      const pendingUser = new UserEntity(
        'user-3', 'pending@test.com', 'pending', 'hash', 'Pending',
        'USER', true, 'PENDING', null, null, null, null, null, null,
        new Date(), new Date(), '010-0000-0000', 'enc', 'addr', null, '00000',
      );
      mockUserRepository.findByEmail.mockResolvedValue(pendingUser);

      await expect(service.login('pending@test.com', 'password')).rejects.toThrow(
        'Account not yet approved',
      );
    });

    it('should reject rejected user', async () => {
      const rejectedUser = new UserEntity(
        'user-4', 'rejected@test.com', 'rejected', 'hash', 'Rejected',
        'USER', true, 'REJECTED', null, null, null, null, null, null,
        new Date(), new Date(), '010-0000-0000', 'enc', 'addr', null, '00000',
      );
      mockUserRepository.findByEmail.mockResolvedValue(rejectedUser);

      await expect(service.login('rejected@test.com', 'password')).rejects.toThrow(
        'Account has been rejected',
      );
    });
  });

  describe('verifyLoginSms', () => {
    it('should return tokens on valid SMS code', async () => {
      const sessionData = JSON.stringify({ userId: 'user-1', phone: '01012345678', attemptsLeft: 5 });
      mockRedis.get
        .mockResolvedValueOnce(sessionData) // session lookup
        .mockResolvedValueOnce('123456');   // SMS code lookup
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.verifyLoginSms('session-id', '123456');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe('user-1');
        expect(result.tokens.accessToken).toBe('mock-access-token');
      }
    });

    it('should decrement attempts on wrong code', async () => {
      const sessionData = JSON.stringify({ userId: 'user-1', phone: '01012345678', attemptsLeft: 3 });
      mockRedis.get
        .mockResolvedValueOnce(sessionData) // session lookup
        .mockResolvedValueOnce('123456');   // SMS code lookup

      const result = await service.verifyLoginSms('session-id', '999999');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.attemptsLeft).toBe(2);
      }
    });

    it('should lock account when attempts exhausted', async () => {
      const sessionData = JSON.stringify({ userId: 'user-1', phone: '01012345678', attemptsLeft: 1 });
      mockRedis.get
        .mockResolvedValueOnce(sessionData) // session lookup
        .mockResolvedValueOnce('123456');   // SMS code lookup

      const result = await service.verifyLoginSms('session-id', '999999');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.attemptsLeft).toBe(0);
      }
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ lockedReason: 'SMS verification attempts exceeded' }),
        }),
      );
    });

    it('should throw on expired session', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      await expect(service.verifyLoginSms('expired-session', '123456')).rejects.toThrow(
        'Session expired',
      );
    });
  });

  describe('validateUser', () => {
    it('should return user DTO for valid payload', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.validateUser({
        sub: 'user-1',
        email: 'test@test.com',
        username: 'testuser',
        name: 'Test User',
        role: 'USER',
      });

      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-1');
    });

    it('should return null for inactive user', async () => {
      const inactiveUser = new UserEntity(
        'user-5', 'inactive@test.com', 'inactive', 'hash', 'Inactive',
        'USER', false, 'APPROVED', null, null, null, null, null, null,
        new Date(), new Date(), '010-0000-0000', 'enc', 'addr', null, '00000',
      );
      mockUserRepository.findById.mockResolvedValue(inactiveUser);

      const result = await service.validateUser({
        sub: 'user-5',
        email: 'inactive@test.com',
        username: 'inactive',
        name: 'Inactive',
        role: 'USER',
      });

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await service.validateUser({
        sub: 'non-existent',
        email: 'nope@test.com',
        username: 'nope',
        name: 'Nope',
        role: 'USER',
      });

      expect(result).toBeNull();
    });
  });

  describe('checkDuplicate', () => {
    it('should detect duplicate email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.checkDuplicate('email', 'test@test.com');

      expect(result).toBe(true);
    });

    it('should detect duplicate username', async () => {
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);

      const result = await service.checkDuplicate('username', 'testuser');

      expect(result).toBe(true);
    });

    it('should detect duplicate phone', async () => {
      mockUserRepository.findByPhone.mockResolvedValue(mockUser);

      const result = await service.checkDuplicate('phone', '01012345678');

      expect(result).toBe(true);
    });

    it('should return false for non-duplicate', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await service.checkDuplicate('email', 'new@test.com');

      expect(result).toBe(false);
    });

    it('should return false for empty value', async () => {
      const result = await service.checkDuplicate('email', '');

      expect(result).toBe(false);
    });

    it('should return false for unknown field', async () => {
      const result = await service.checkDuplicate('unknown', 'value');

      expect(result).toBe(false);
    });
  });

  describe('logout', () => {
    it('should delete refresh token on logout', async () => {
      await service.logout('some-refresh-token');

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
      });
    });
  });
});
