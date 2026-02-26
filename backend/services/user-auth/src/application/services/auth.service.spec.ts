import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
import { SmsVerificationService } from './sms-verification.service';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

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
  '010-1234-5678',
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
  user: { findMany: jest.fn().mockResolvedValue([]) },
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

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SmsVerificationService, useValue: mockSmsVerification },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should login with valid email and password', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('test@test.com', 'password123');

      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('test@test.com');
      expect(result.tokens.accessToken).toBe('mock-access-token');
    });

    it('should login with valid username', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('testuser', 'password123');

      expect(result.user.username).toBe('testuser');
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

      const result = await service.checkDuplicate('phone', '010-1234-5678');

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
