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
