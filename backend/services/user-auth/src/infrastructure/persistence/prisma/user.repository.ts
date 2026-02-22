/**
 * @file 사용자 리포지토리 구현체
 * @description Prisma를 사용한 사용자 리포지토리 구현체 (어댑터)
 *
 * @file User Repository Implementation
 * @description Prisma-based user repository implementation (adapter)
 */
import { Injectable } from '@nestjs/common';
import { UserRole } from '@mock-exchange/common';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../../domain/entities/user.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: UserEntity): Promise<UserEntity> {
    const created = await this.prisma.user.create({
      data: {
        email: user.email,
        username: user.username,
        passwordHash: user.passwordHash,
        name: user.name,
        role: user.role,
        approvalStatus: user.approvalStatus as never,
        phone: user.phone,
        encryptedRrn: user.encryptedRrn,
        address: user.address,
        addressDetail: user.addressDetail ?? undefined,
        zipCode: user.zipCode,
      },
    });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toDomain(user) : null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    return user ? this.toDomain(user) : null;
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    return user ? this.toDomain(user) : null;
  }

  private toDomain(raw: {
    id: string;
    email: string;
    username: string;
    passwordHash: string;
    name: string;
    role: string;
    isActive: boolean;
    approvalStatus: string;
    approvedAt: Date | null;
    approvedBy: string | null;
    approvalNote: string | null;
    rejectedAt: Date | null;
    rejectedBy: string | null;
    rejectionNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    phone: string;
    encryptedRrn: string;
    address: string;
    addressDetail: string | null;
    zipCode: string;
  }): UserEntity {
    return new UserEntity(
      raw.id,
      raw.email,
      raw.username,
      raw.passwordHash,
      raw.name,
      raw.role as UserRole,
      raw.isActive,
      raw.approvalStatus,
      raw.approvedAt,
      raw.approvedBy,
      raw.approvalNote,
      raw.rejectedAt,
      raw.rejectedBy,
      raw.rejectionNote,
      raw.createdAt,
      raw.updatedAt,
      raw.phone,
      raw.encryptedRrn,
      raw.address,
      raw.addressDetail,
      raw.zipCode,
    );
  }
}
