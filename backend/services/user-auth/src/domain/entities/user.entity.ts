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
      params.role || 'TRADER',
      true,
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
