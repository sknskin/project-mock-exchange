/**
 * @file 관리자 역할 가드
 * @description JWT 인증 후 ADMIN/SYSTEM 역할을 검증합니다
 *
 * @file Admin Roles Guard
 * @description Verifies ADMIN/SYSTEM role after JWT authentication
 */
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminRolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SYSTEM')) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
