/**
 * @file 사용자 도메인 엔티티
 * @description 사용자 정보를 표현하는 도메인 엔티티
 *
 * @file User Domain Entity
 * @description Domain entity representing user information
 */
import { UserRole } from '@mock-exchange/common';

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly username: string,
    public readonly passwordHash: string,
    public readonly name: string,
    public readonly role: UserRole,
    public readonly isActive: boolean,
    public readonly approvalStatus: string,
    public readonly approvedAt: Date | null,
    public readonly approvedBy: string | null,
    public readonly approvalNote: string | null,
    public readonly rejectedAt: Date | null,
    public readonly rejectedBy: string | null,
    public readonly rejectionNote: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly phone: string,
    public readonly encryptedRrn: string,
    public readonly address: string,
    public readonly addressDetail: string | null,
    public readonly zipCode: string,
  ) {}

  static create(params: {
    id: string;
    email: string;
    username: string;
    passwordHash: string;
    name: string;
    role?: UserRole;
    approvalStatus?: string;
    phone: string;
    encryptedRrn: string;
    address: string;
    addressDetail?: string | null;
    zipCode: string;
  }): UserEntity {
    return new UserEntity(
      params.id,
      params.email,
      params.username,
      params.passwordHash,
      params.name,
      params.role || 'USER',
      true,
      params.approvalStatus ?? 'PENDING',
      null,
      null,
      null,
      null,
      null,
      null,
      new Date(),
      new Date(),
      params.phone,
      params.encryptedRrn,
      params.address,
      params.addressDetail ?? null,
      params.zipCode,
    );
  }
}
