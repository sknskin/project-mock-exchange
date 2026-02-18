/**
 * @file 사용자 리포지토리 인터페이스
 * @description 사용자 데이터 접근을 위한 리포지토리 인터페이스 (포트)
 *
 * @file User Repository Interface
 * @description Repository interface (port) for user data access
 */
import { UserEntity } from '../entities/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserRepository {
  create(user: UserEntity): Promise<UserEntity>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  findByPhone(phone: string): Promise<UserEntity | null>;
}
