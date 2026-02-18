/**
 * @file 인증 공통 DTO
 * @description 마이크로서비스 간 인증 관련 공유 Data Transfer Object
 *
 * @file Auth Common DTO
 * @description Shared authentication-related Data Transfer Objects across services
 */
import { UserRole } from '../constants';

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
}

export interface LoginDto {
  identifier: string;
  password: string;
}

export interface AuthTokensDto {
  accessToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface UserDto {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: string;
}
