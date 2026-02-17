import { UserRole } from '@mock-exchange/common';

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly username: string,
    public readonly passwordHash: string,
    public readonly role: UserRole,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    email: string;
    username: string;
    passwordHash: string;
    role?: UserRole;
  }): UserEntity {
    return new UserEntity(
      params.id,
      params.email,
      params.username,
      params.passwordHash,
      params.role || 'TRADER',
      true,
      new Date(),
      new Date(),
    );
  }
}
