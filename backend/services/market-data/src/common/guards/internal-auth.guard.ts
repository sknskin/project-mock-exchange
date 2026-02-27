import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['x-internal-token'];
    const secret = process.env.INTERNAL_SERVICE_SECRET;
    if (!secret || token !== secret) {
      throw new UnauthorizedException('Invalid internal service token');
    }
    return true;
  }
}
