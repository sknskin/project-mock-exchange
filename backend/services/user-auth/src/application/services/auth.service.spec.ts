import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
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

function createMockUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return new UserEntity(
    overrides.id ?? 'user-1',
    overrides.email ?? 'test@test.com',
    overrides.username ?? 'testuser',
    overrides.passwordHash ?? '$2b$12$hashedpassword',
    overrides.name ?? 'Test User',
    overrides.role ?? 'USER',
    overrides.isActive ?? true,
    overrides.approvalStatus ?? 'APPROVED',
    overrides.approvedAt ?? new Date(),
    overrides.approvedBy ?? null,
    overrides.approvalNote ?? null,
    overrides.rejectedAt ?? null,
    overrides.rejectedBy ?? null,
    overrides.rejectionNote ?? null,
    overrides.createdAt ?? new Date(),
    overrides.updatedAt ?? new Date(),
    overrides.phone ?? '01012345678',
    overrides.encryptedRrn ?? 'encrypted-rrn',
    overrides.address ?? '서울시 강남구',
    overrides.addressDetail ?? '101호',
    overrides.zipCode ?? '06241',
  );
}

const mockUser = createMockUser();

const VALID_REGISTER_PARAMS = {
  email: 'new@example.com',
  username: 'newuser',
  password: 'Password123!',
  passwordConfirm: 'Password123!',
  name: 'New User',
  phone: '01098765432',
  residentNumber: '9001011234567',
  address: '서울시 강남구',
  addressDetail: '201호',
  zipCode: '06000',
};

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
      ENCRYPTION_SALT: 'test-salt',
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

  // ============================================================
  // register()
  // ============================================================
  describe('register', () => {
    beforeEach(() => {
      mockSmsVerification.isPhoneVerified.mockResolvedValue(true);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.findByPhone.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((entity: UserEntity) =>
        Promise.resolve(
          createMockUser({
            id: 'created-id',
            email: entity.email,
            username: entity.username,
            name: entity.name,
            phone: entity.phone,
          }),
        ),
      );
    });

    it('should register a new user successfully', async () => {
      const result = await service.register(VALID_REGISTER_PARAMS);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'created-id',
          email: 'new@example.com',
          username: 'newuser',
          name: 'New User',
          role: 'USER',
          isActive: true,
        }),
      );
      expect(mockUserRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      await expect(
        service.register({ ...VALID_REGISTER_PARAMS, passwordConfirm: 'wrong' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when phone is not verified', async () => {
      mockSmsVerification.isPhoneVerified.mockResolvedValue(false);

      await expect(service.register(VALID_REGISTER_PARAMS)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(VALID_REGISTER_PARAMS)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when username already exists', async () => {
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);

      await expect(service.register(VALID_REGISTER_PARAMS)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when phone already exists', async () => {
      mockUserRepository.findByPhone.mockResolvedValue(mockUser);

      await expect(service.register(VALID_REGISTER_PARAMS)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException for invalid resident number', async () => {
      await expect(
        service.register({ ...VALID_REGISTER_PARAMS, residentNumber: '123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create notifications for admin users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]);

      await service.register(VALID_REGISTER_PARAMS);

      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ userId: 'admin-1', type: 'REGISTRATION_REQUEST' }),
            expect.objectContaining({ userId: 'admin-2', type: 'REGISTRATION_REQUEST' }),
          ]),
        }),
      );
    });

    it('should not fail if notification creation fails', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      mockPrisma.notification.createMany.mockRejectedValue(new Error('DB error'));

      const result = await service.register(VALID_REGISTER_PARAMS);
      expect(result).toBeDefined();
    });

    it('should hash the password with bcrypt', async () => {
      await service.register(VALID_REGISTER_PARAMS);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
    });
  });

  // ============================================================
  // login()
  // ============================================================
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
      mockUserRepository.findByEmail.mockResolvedValue(
        createMockUser({ isActive: false }),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login('test@test.com', 'password')).rejects.toThrow(
        'Account is deactivated',
      );
    });

    it('should reject unapproved user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(
        createMockUser({ approvalStatus: 'PENDING' }),
      );

      await expect(service.login('test@test.com', 'password')).rejects.toThrow(
        'Account not yet approved',
      );
    });

    it('should reject rejected user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(
        createMockUser({ approvalStatus: 'REJECTED' }),
      );

      await expect(service.login('test@test.com', 'password')).rejects.toThrow(
        'Account has been rejected',
      );
    });

    it('should allow SYSTEM role even if not approved', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(
        createMockUser({ role: 'SYSTEM', approvalStatus: 'PENDING' }),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('test@test.com', 'password');
      expect(result.requireSmsVerification).toBe(true);
    });

    it('should store login session in Redis with correct TTL', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login('test@test.com', 'password');

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^login:session:/),
        expect.stringContaining('"userId":"user-1"'),
        'EX',
        180,
      );
    });
  });

  // ============================================================
  // verifyLoginSms()
  // ============================================================
  describe('verifyLoginSms', () => {
    it('should return tokens on valid SMS code', async () => {
      const sessionData = JSON.stringify({ userId: 'user-1', phone: '01012345678', attemptsLeft: 5 });
      mockRedis.get
        .mockResolvedValueOnce(sessionData)
        .mockResolvedValueOnce('123456');
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.verifyLoginSms('session-id', '123456');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe('user-1');
        expect(result.tokens.accessToken).toBe('mock-access-token');
        expect(result.refreshToken).toBeDefined();
      }
    });

    it('should decrement attempts on wrong code', async () => {
      const sessionData = JSON.stringify({ userId: 'user-1', phone: '01012345678', attemptsLeft: 3 });
      mockRedis.get
        .mockResolvedValueOnce(sessionData)
        .mockResolvedValueOnce('123456');

      const result = await service.verifyLoginSms('session-id', '999999');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.attemptsLeft).toBe(2);
        expect(result.message).toBe('인증번호가 일치하지 않습니다.');
      }
    });

    it('should lock account when attempts exhausted', async () => {
      const sessionData = JSON.stringify({ userId: 'user-1', phone: '01012345678', attemptsLeft: 1 });
      mockRedis.get
        .mockResolvedValueOnce(sessionData)
        .mockResolvedValueOnce('123456');

      const result = await service.verifyLoginSms('session-id', '999999');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.attemptsLeft).toBe(0);
        expect(result.message).toContain('계정이 잠겼습니다');
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

    it('should lock account when attemptsLeft is already 0', async () => {
      const sessionData = JSON.stringify({ userId: 'user-1', phone: '01012345678', attemptsLeft: 0 });
      mockRedis.get.mockResolvedValueOnce(sessionData);

      await expect(service.verifyLoginSms('session-id', '000000')).rejects.toThrow(
        'Account is locked',
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ lockedAt: expect.any(Date) }),
        }),
      );
      expect(mockRedis.del).toHaveBeenCalledWith('login:session:session-id');
    });

    it('should treat expired SMS code (null) as wrong code', async () => {
      const sessionData = JSON.stringify({ userId: 'user-1', phone: '01012345678', attemptsLeft: 5 });
      mockRedis.get
        .mockResolvedValueOnce(sessionData)
        .mockResolvedValueOnce(null); // SMS code expired

      const result = await service.verifyLoginSms('session-id', '123456');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.attemptsLeft).toBe(4);
      }
    });

    it('should throw when user not found after verification', async () => {
      const sessionData = JSON.stringify({ userId: 'user-1', phone: '01012345678', attemptsLeft: 5 });
      mockRedis.get
        .mockResolvedValueOnce(sessionData)
        .mockResolvedValueOnce('123456');
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.verifyLoginSms('session-id', '123456')).rejects.toThrow(
        'User not found',
      );
    });

    it('should clean up both session and sms keys on success', async () => {
      const sessionData = JSON.stringify({ userId: 'user-1', phone: '01012345678', attemptsLeft: 5 });
      mockRedis.get
        .mockResolvedValueOnce(sessionData)
        .mockResolvedValueOnce('123456');
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await service.verifyLoginSms('session-id', '123456');

      expect(mockRedis.del).toHaveBeenCalledWith('login:session:session-id');
      expect(mockRedis.del).toHaveBeenCalledWith('sms:verify:01012345678');
    });

    it('should create login log on successful verification', async () => {
      const sessionData = JSON.stringify({ userId: 'user-1', phone: '01012345678', attemptsLeft: 5 });
      mockRedis.get
        .mockResolvedValueOnce(sessionData)
        .mockResolvedValueOnce('123456');
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await service.verifyLoginSms('session-id', '123456');

      expect(mockPrisma.loginLog.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
      });
    });
  });

  // ============================================================
  // refreshTokens()
  // ============================================================
  describe('refreshTokens', () => {
    const storedUser = {
      id: 'user-1',
      email: 'test@test.com',
      username: 'testuser',
      passwordHash: '$2b$12$hashedpassword',
      name: 'Test User',
      role: 'USER',
      isActive: true,
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: null,
      approvalNote: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      phone: '01012345678',
      encryptedRrn: 'enc',
      address: '서울시',
      addressDetail: null,
      zipCode: '06000',
    };

    const mockStoredToken = {
      id: 'rt-1',
      tokenHash: 'somehash',
      expiresAt: new Date(Date.now() + 86400000),
      user: storedUser,
    };

    it('should rotate refresh token and return new tokens', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);

      const result = await service.refreshTokens('old-refresh-token');

      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
      });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException and delete expired token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
      });
    });

    it('should generate new JWT with correct payload', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);

      await service.refreshTokens('old-token');

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          email: 'test@test.com',
          username: 'testuser',
          name: 'Test User',
          role: 'USER',
        }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
    });
  });

  // ============================================================
  // validateUser()
  // ============================================================
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
      mockUserRepository.findById.mockResolvedValue(
        createMockUser({ isActive: false }),
      );

      const result = await service.validateUser({
        sub: 'user-1',
        email: 'test@test.com',
        username: 'testuser',
        name: 'Test User',
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

  // ============================================================
  // checkDuplicate()
  // ============================================================
  describe('checkDuplicate', () => {
    it('should detect duplicate email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      expect(await service.checkDuplicate('email', 'test@test.com')).toBe(true);
    });

    it('should detect duplicate username', async () => {
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      expect(await service.checkDuplicate('username', 'testuser')).toBe(true);
    });

    it('should detect duplicate phone', async () => {
      mockUserRepository.findByPhone.mockResolvedValue(mockUser);
      expect(await service.checkDuplicate('phone', '01012345678')).toBe(true);
    });

    it('should return false for non-duplicate email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      expect(await service.checkDuplicate('email', 'new@test.com')).toBe(false);
    });

    it('should return false for non-duplicate username', async () => {
      mockUserRepository.findByUsername.mockResolvedValue(null);
      expect(await service.checkDuplicate('username', 'newuser')).toBe(false);
    });

    it('should return false for non-duplicate phone', async () => {
      mockUserRepository.findByPhone.mockResolvedValue(null);
      expect(await service.checkDuplicate('phone', '01099999999')).toBe(false);
    });

    it('should return false for empty value', async () => {
      expect(await service.checkDuplicate('email', '')).toBe(false);
    });

    it('should return false for unknown field', async () => {
      expect(await service.checkDuplicate('unknown', 'value')).toBe(false);
    });
  });

  // ============================================================
  // logout()
  // ============================================================
  describe('logout', () => {
    it('should delete refresh token by hash', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('some-refresh-token');

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
      });
    });

    it('should not throw when token does not exist', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.logout('nonexistent-token')).resolves.toBeUndefined();
    });
  });
});
