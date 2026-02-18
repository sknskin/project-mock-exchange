/**
 * @file JWT 인증 가드
 * @description JWT 토큰을 검증하여 인증된 요청만 허용합니다
 *
 * @file JWT Auth Guard
 * @description Validates JWT tokens to allow only authenticated requests
 */
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
