/**
 * @file 인증된 요청 인터페이스
 * @description JWT 인증 후 req.user에 포함되는 사용자 정보 타입 정의
 *
 * @file Authenticated Request Interface
 * @description Type definition for user info attached to req.user after JWT authentication
 */
import { Request } from 'express';

/** ERR-M-02: JWT 인증 후 req.user에 추가되는 사용자 정보 인터페이스
 * ERR-M-02: User info interface added to req.user after JWT authentication */
export interface AuthenticatedUser {
  id: string;
  role?: string;
}

/** ERR-M-02: any 타입 대신 사용하는 인증된 요청 인터페이스
 * ERR-M-02: Authenticated request interface replacing any type casts */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
