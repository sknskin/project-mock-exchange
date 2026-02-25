/**
 * @file 현재 사용자 데코레이터
 * @description JWT에서 추출한 사용자 정보를 컨트롤러 파라미터로 주입합니다
 *
 * @file Current User Decorator
 * @description Injects authenticated user info from JWT into controller parameters
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDto } from '@virtuex/common';

export const CurrentUser = createParamDecorator(
  (data: keyof UserDto | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserDto;
    return data ? user?.[data] : user;
  },
);
